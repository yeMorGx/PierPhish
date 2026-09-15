insert into public.pierphish_workspaces (
  id,
  name,
  environment,
  description
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Workspace principal',
  'production',
  'Operação oficial do PierPhish'
)
on conflict (id) do nothing;

grant select, insert, update on table public.pierphish_workspaces to authenticated;
grant select, insert, update on table public.pierphish_companies to authenticated;

create policy "Super admins manage PierPhish workspaces"
on public.pierphish_workspaces
for all
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner', 'super_admin')
  or (select auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
)
with check (
  (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner', 'super_admin')
  or (select auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
);

create policy "Super admins manage PierPhish companies"
on public.pierphish_companies
for all
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner', 'super_admin')
  or (select auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
)
with check (
  (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner', 'super_admin')
  or (select auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
);
