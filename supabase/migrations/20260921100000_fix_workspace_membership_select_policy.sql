drop policy if exists "Members can view assigned workspaces"
  on public.pierphish_workspaces;

create policy "Members can view assigned workspaces"
  on public.pierphish_workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pierphish_workspace_members as member
      where member.workspace_id = public.pierphish_workspaces.id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
    or (select (auth.jwt() ->> 'email')) = 'admin@teste.com'
    or (select ((auth.jwt() -> 'app_metadata') ->> 'role')) in
      ('admin', 'owner', 'super_admin')
    or (select ((auth.jwt() -> 'app_metadata') ->> 'is_admin')) = 'true'
  );
