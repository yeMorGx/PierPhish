create table if not exists public.pierphish_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'analyst', 'viewer')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists pierphish_workspace_members_workspace_id_idx
  on public.pierphish_workspace_members(workspace_id);

create index if not exists pierphish_workspace_members_user_id_idx
  on public.pierphish_workspace_members(user_id);

alter table public.pierphish_workspace_members enable row level security;

revoke all on table public.pierphish_workspace_members from anon, authenticated;
grant select on table public.pierphish_workspace_members to authenticated;
grant all on table public.pierphish_workspace_members to service_role;

drop policy if exists "Users and admins can view workspace memberships"
  on public.pierphish_workspace_members;

create policy "Users and admins can view workspace memberships"
  on public.pierphish_workspace_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select (auth.jwt() ->> 'email')) = 'admin@teste.com'
    or (select ((auth.jwt() -> 'app_metadata') ->> 'role')) in ('admin', 'owner', 'super_admin')
    or (select ((auth.jwt() -> 'app_metadata') ->> 'is_admin')) = 'true'
  );

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
      where member.workspace_id = id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

insert into public.pierphish_workspace_members (workspace_id, user_id, role)
select workspace.id, auth_user.id, 'owner'
from public.pierphish_workspaces as workspace
join auth.users as auth_user
  on lower(auth_user.email) = 'admin@teste.com'
where workspace.name = 'Workspace principal'
  and workspace.environment = 'production'
on conflict (workspace_id, user_id) do update
set role = 'owner', status = 'active', updated_at = now();
