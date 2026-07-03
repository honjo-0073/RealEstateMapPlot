create extension if not exists postgis;
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'editor', 'viewer', 'external_viewer');
create type public.property_visibility as enum ('internal', 'external');
create type public.document_source as enum ('supabase_storage', 'google_drive');
create type public.analysis_job_status as enum ('queued', 'processing', 'review_required', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.user_role not null default 'external_viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  source_google_sheet_row_id text,
  name text not null,
  asset_type text,
  address text not null,
  price_amount_yen bigint,
  price_raw_text text,
  land_area_sqm numeric(12, 2),
  floor_area_sqm numeric(12, 2),
  zoning text,
  coverage_ratio_raw text,
  road_access text,
  transaction_type text,
  latitude double precision,
  longitude double precision,
  location geography(Point, 4326),
  notes text,
  visibility public.property_visibility not null default 'internal',
  analyzed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_price_non_negative check (price_amount_yen is null or price_amount_yen >= 0),
  constraint properties_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint properties_longitude_range check (longitude is null or longitude between -180 and 180)
);

create index properties_location_gix on public.properties using gist(location);
create index properties_name_trgm_idx on public.properties using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(address, '') || ' ' || coalesce(notes, '')));
create index properties_visibility_idx on public.properties(visibility);
create index properties_analyzed_at_idx on public.properties(analyzed_at desc);

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  source public.document_source not null,
  storage_bucket text,
  storage_path text,
  drive_file_id text,
  url text,
  original_filename text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint property_documents_source_check check (
    (source = 'supabase_storage' and storage_bucket is not null and storage_path is not null)
    or
    (source = 'google_drive' and url is not null)
  )
);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.property_documents(id) on delete set null,
  status public.analysis_job_status not null default 'queued',
  extracted_payload jsonb,
  error_message text,
  approved_property_id uuid references public.properties(id) on delete set null,
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();

create trigger analysis_jobs_set_updated_at before update on public.analysis_jobs
for each row execute function public.set_updated_at();

create or replace function public.set_property_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  else
    new.location = null;
  end if;
  return new;
end;
$$;

create trigger properties_set_location before insert or update of latitude, longitude on public.properties
for each row execute function public.set_property_location();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    'external_viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'external_viewer'::public.user_role);
$$;

create or replace function public.can_view_property(property_visibility public.property_visibility)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and (
      public.current_user_role() in ('admin', 'editor', 'viewer')
      or property_visibility = 'external'
    );
$$;

create or replace function public.search_properties(
  search_text text default null,
  min_price bigint default null,
  max_price bigint default null,
  transaction_type_filter text default null,
  asset_type_filter text default null,
  north double precision default null,
  south double precision default null,
  east double precision default null,
  west double precision default null
)
returns setof public.properties
language sql
stable
as $$
  select p.*
  from public.properties p
  where public.can_view_property(p.visibility)
    and (
      search_text is null
      or search_text = ''
      or p.name ilike '%' || search_text || '%'
      or p.address ilike '%' || search_text || '%'
      or coalesce(p.notes, '') ilike '%' || search_text || '%'
    )
    and (min_price is null or p.price_amount_yen >= min_price)
    and (max_price is null or p.price_amount_yen <= max_price)
    and (transaction_type_filter is null or transaction_type_filter = '' or p.transaction_type = transaction_type_filter)
    and (asset_type_filter is null or asset_type_filter = '' or p.asset_type = asset_type_filter)
    and (
      north is null or south is null or east is null or west is null
      or (p.latitude between south and north and p.longitude between west and east)
    )
  order by p.analyzed_at desc nulls last, p.created_at desc;
$$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_documents enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select using (id = auth.uid() or public.current_user_role() = 'admin');

create policy profiles_update_self on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
for all using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy properties_select_visible on public.properties
for select using (public.can_view_property(visibility));

create policy properties_editor_insert on public.properties
for insert with check (public.current_user_role() in ('admin', 'editor'));

create policy properties_editor_update on public.properties
for update using (public.current_user_role() in ('admin', 'editor')) with check (public.current_user_role() in ('admin', 'editor'));

create policy properties_admin_delete on public.properties
for delete using (public.current_user_role() = 'admin');

create policy documents_select_visible on public.property_documents
for select using (
  property_id is null
  or exists (
    select 1 from public.properties p
    where p.id = property_documents.property_id
      and public.can_view_property(p.visibility)
  )
);

create policy documents_editor_insert on public.property_documents
for insert with check (public.current_user_role() in ('admin', 'editor'));

create policy documents_editor_update on public.property_documents
for update using (public.current_user_role() in ('admin', 'editor')) with check (public.current_user_role() in ('admin', 'editor'));

create policy documents_admin_delete on public.property_documents
for delete using (public.current_user_role() = 'admin');

create policy analysis_select_own_or_staff on public.analysis_jobs
for select using (requested_by = auth.uid() or public.current_user_role() in ('admin', 'editor'));

create policy analysis_editor_insert on public.analysis_jobs
for insert with check (public.current_user_role() in ('admin', 'editor'));

create policy analysis_editor_update on public.analysis_jobs
for update using (public.current_user_role() in ('admin', 'editor')) with check (public.current_user_role() in ('admin', 'editor'));

create policy audit_admin_select on public.audit_logs
for select using (public.current_user_role() = 'admin');

create policy audit_staff_insert on public.audit_logs
for insert with check (public.current_user_role() in ('admin', 'editor'));

insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;

create policy storage_property_docs_read on storage.objects
for select using (
  bucket_id = 'property-documents'
  and auth.uid() is not null
);

create policy storage_property_docs_write on storage.objects
for insert with check (
  bucket_id = 'property-documents'
  and public.current_user_role() in ('admin', 'editor')
);

create policy storage_property_docs_update on storage.objects
for update using (
  bucket_id = 'property-documents'
  and public.current_user_role() in ('admin', 'editor')
);

create policy storage_property_docs_delete on storage.objects
for delete using (
  bucket_id = 'property-documents'
  and public.current_user_role() = 'admin'
);
