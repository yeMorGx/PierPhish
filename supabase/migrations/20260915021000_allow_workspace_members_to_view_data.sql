create or replace function public.can_view_pierphish_data()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.internal_admins
    where user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.pierphish_workspace_members as member
    join public.pierphish_workspaces as workspace
      on workspace.id = member.workspace_id
    where member.user_id = (select auth.uid())
      and member.status = 'active'
      and workspace.name = 'Workspace principal'
      and workspace.environment = 'production'
  );
$$;

revoke execute on function public.can_view_pierphish_data() from anon;
grant execute on function public.can_view_pierphish_data() to authenticated;

drop policy if exists "admins view campaigns" on public.beephish_campaigns;
create policy "Workspace members view campaigns"
  on public.beephish_campaigns
  for select
  to authenticated
  using ((select public.can_view_pierphish_data()));

drop policy if exists "admins view results" on public.beephish_results;
create policy "Workspace members view results"
  on public.beephish_results
  for select
  to authenticated
  using ((select public.can_view_pierphish_data()));

drop policy if exists "admins view events" on public.beephish_events;
create policy "Workspace members view events"
  on public.beephish_events
  for select
  to authenticated
  using ((select public.can_view_pierphish_data()));
