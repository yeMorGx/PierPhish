create table if not exists public.pierphish_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.pierphish_workspaces(id) on delete cascade,
  type text not null default 'workspace_invite'
    check (type in ('workspace_invite', 'system', 'security')),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 500),
  action_path text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pierphish_notifications_recipient_idx
  on public.pierphish_notifications(recipient_user_id, created_at desc);

create index if not exists pierphish_notifications_workspace_idx
  on public.pierphish_notifications(workspace_id, created_at desc);

alter table public.pierphish_notifications enable row level security;

revoke all on table public.pierphish_notifications from anon, authenticated;
grant select, update on table public.pierphish_notifications to authenticated;
grant all on table public.pierphish_notifications to service_role;

drop policy if exists "Users can read their notifications"
  on public.pierphish_notifications;

create policy "Users can read their notifications"
  on public.pierphish_notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_user_id);

drop policy if exists "Users can update their notifications"
  on public.pierphish_notifications;

create policy "Users can update their notifications"
  on public.pierphish_notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_user_id)
  with check ((select auth.uid()) = recipient_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pierphish_notifications'
  ) then
    alter publication supabase_realtime add table public.pierphish_notifications;
  end if;
end
$$;
