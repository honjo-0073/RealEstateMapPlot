drop policy if exists properties_editor_insert on public.properties;
create policy properties_authenticated_insert on public.properties
for insert with check (auth.uid() is not null);

drop policy if exists properties_editor_update on public.properties;
create policy properties_authenticated_update on public.properties
for update using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists documents_editor_update on public.property_documents;
create policy documents_authenticated_update on public.property_documents
for update using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists audit_staff_insert on public.audit_logs;
create policy audit_authenticated_insert on public.audit_logs
for insert with check (auth.uid() is not null);
