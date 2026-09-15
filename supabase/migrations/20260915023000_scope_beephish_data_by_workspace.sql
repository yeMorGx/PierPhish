alter table public.beephish_campaigns
  add column if not exists workspace_id uuid,
  add column if not exists company_id uuid;

alter table public.beephish_results
  add column if not exists workspace_id uuid,
  add column if not exists company_id uuid;

alter table public.beephish_events
  add column if not exists workspace_id uuid,
  add column if not exists company_id uuid;

do $$
declare
  primary_workspace uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  primary_company uuid;
begin
  select company.id
    into primary_company
  from public.pierphish_companies as company
  where company.workspace_id = primary_workspace
    and company.status = 'active'
  order by company.created_at asc
  limit 1;

  update public.beephish_campaigns
  set workspace_id = coalesce(workspace_id, primary_workspace),
      company_id = coalesce(company_id, primary_company)
  where workspace_id is null or company_id is null;

  update public.beephish_results as result
  set workspace_id = campaign.workspace_id,
      company_id = campaign.company_id
  from public.beephish_campaigns as campaign
  where campaign.id = result.campaign_id
    and (result.workspace_id is null or result.company_id is null);

  update public.beephish_events as event
  set workspace_id = campaign.workspace_id,
      company_id = campaign.company_id
  from public.beephish_campaigns as campaign
  where campaign.id = event.campaign_id
    and (event.workspace_id is null or event.company_id is null);
end $$;

create index if not exists beephish_campaigns_workspace_id_idx
  on public.beephish_campaigns(workspace_id);

create index if not exists beephish_campaigns_company_id_idx
  on public.beephish_campaigns(company_id);

create index if not exists beephish_results_workspace_id_idx
  on public.beephish_results(workspace_id);

create index if not exists beephish_results_company_id_idx
  on public.beephish_results(company_id);

create index if not exists beephish_events_workspace_id_idx
  on public.beephish_events(workspace_id);

create index if not exists beephish_events_company_id_idx
  on public.beephish_events(company_id);

create or replace function public.can_view_pierphish_workspace_data(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
  or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
    ('admin', 'owner', 'super_admin')
  or exists (
    select 1
    from public.internal_admins as internal_admin
    where internal_admin.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.pierphish_workspace_members as member
    where member.workspace_id = p_workspace_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  );
$$;

revoke execute on function public.can_view_pierphish_workspace_data(uuid) from anon;
grant execute on function public.can_view_pierphish_workspace_data(uuid) to authenticated;

drop policy if exists "Workspace members view campaigns" on public.beephish_campaigns;
create policy "Workspace members view campaigns"
  on public.beephish_campaigns
  for select
  to authenticated
  using ((select public.can_view_pierphish_workspace_data(workspace_id)));

drop policy if exists "Workspace members view results" on public.beephish_results;
create policy "Workspace members view results"
  on public.beephish_results
  for select
  to authenticated
  using ((select public.can_view_pierphish_workspace_data(workspace_id)));

drop policy if exists "Workspace members view events" on public.beephish_events;
create policy "Workspace members view events"
  on public.beephish_events
  for select
  to authenticated
  using ((select public.can_view_pierphish_workspace_data(workspace_id)));

drop policy if exists "Admins manage campaigns" on public.beephish_campaigns;
create policy "Admins manage campaigns"
  on public.beephish_campaigns
  for all
  to authenticated
  using (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  )
  with check (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  );

drop policy if exists "Admins manage results" on public.beephish_results;
create policy "Admins manage results"
  on public.beephish_results
  for all
  to authenticated
  using (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  )
  with check (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  );

drop policy if exists "Admins manage events" on public.beephish_events;
create policy "Admins manage events"
  on public.beephish_events
  for all
  to authenticated
  using (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  )
  with check (
    (select auth.jwt() ->> 'email') = 'admin@teste.com'
    or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
    or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in
      ('admin', 'owner', 'super_admin')
  );
