create or replace function public.can_view_property(property_visibility public.property_visibility)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

drop policy if exists documents_editor_insert on public.property_documents;
create policy documents_authenticated_insert on public.property_documents
for insert with check (auth.uid() is not null);

drop policy if exists analysis_editor_insert on public.analysis_jobs;
create policy analysis_authenticated_insert on public.analysis_jobs
for insert with check (auth.uid() is not null);

drop policy if exists analysis_editor_update on public.analysis_jobs;
create policy analysis_requester_or_staff_update on public.analysis_jobs
for update using (
  requested_by = auth.uid()
  or public.current_user_role() in ('admin', 'editor')
) with check (
  requested_by = auth.uid()
  or public.current_user_role() in ('admin', 'editor')
);

drop policy if exists storage_property_docs_write on storage.objects;
create policy storage_property_docs_authenticated_insert on storage.objects
for insert with check (
  bucket_id = 'property-documents'
  and auth.uid() is not null
);
