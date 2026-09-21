-- Private examples of the real email sent by a campaign.
-- The original binary is stored in Supabase Storage; this table stores metadata
-- and the already-sanitized representation used by the preview.

create table if not exists public.campaign_email_samples (
  id uuid primary key default gen_random_uuid(),
  campaign_id bigint not null,
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  company_id uuid not null references public.pierphish_companies(id) on delete cascade,
  original_file_name text not null check (char_length(original_file_name) between 1 and 240),
  file_extension text not null check (file_extension in ('eml', 'msg')),
  mime_type text not null check (char_length(mime_type) between 1 and 180),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null unique,
  subject text,
  from_address text,
  to_addresses text[] not null default '{}',
  sent_at timestamptz,
  parsed_html text not null default '',
  parsed_text text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_email_samples_campaign_idx
  on public.campaign_email_samples(campaign_id);

create index if not exists campaign_email_samples_workspace_idx
  on public.campaign_email_samples(workspace_id);

create index if not exists campaign_email_samples_sha256_idx
  on public.campaign_email_samples(sha256);

create unique index if not exists campaign_email_samples_active_campaign_idx
  on public.campaign_email_samples(campaign_id)
  where is_active;

create unique index if not exists campaign_email_samples_workspace_hash_idx
  on public.campaign_email_samples(workspace_id, sha256);

create table if not exists public.campaign_email_sample_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id bigint,
  workspace_id uuid references public.pierphish_workspaces(id) on delete set null,
  sample_id uuid references public.campaign_email_samples(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('upload', 'replace', 'delete', 'parse_failed', 'upload_failed', 'orphan_cleanup')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_email_sample_logs_workspace_idx
  on public.campaign_email_sample_logs(workspace_id, created_at desc);

create index if not exists campaign_email_sample_logs_campaign_idx
  on public.campaign_email_sample_logs(campaign_id, created_at desc);

alter table public.campaign_email_samples enable row level security;
alter table public.campaign_email_sample_logs enable row level security;

revoke all on table public.campaign_email_samples from anon, authenticated;
revoke all on table public.campaign_email_sample_logs from anon, authenticated;
grant select, insert, update, delete on table public.campaign_email_samples to authenticated;
grant all on table public.campaign_email_samples to service_role;
grant all on table public.campaign_email_sample_logs to service_role;

create or replace function public.can_view_campaign_email_sample(p_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
  or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in ('admin', 'owner', 'super_admin')
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

create or replace function public.can_manage_campaign_email_sample(p_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select auth.jwt() ->> 'email') = 'admin@teste.com'
  or (select (auth.jwt() -> 'app_metadata' ->> 'is_admin')) = 'true'
  or (select (auth.jwt() -> 'app_metadata' ->> 'role')) in ('admin', 'owner', 'super_admin')
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
      and member.role in ('owner', 'admin', 'analyst')
  );
$$;

revoke execute on function public.can_view_campaign_email_sample(uuid) from anon;
revoke execute on function public.can_manage_campaign_email_sample(uuid) from anon;
grant execute on function public.can_view_campaign_email_sample(uuid) to authenticated;
grant execute on function public.can_manage_campaign_email_sample(uuid) to authenticated;

drop policy if exists "Workspace members view campaign email samples"
  on public.campaign_email_samples;
create policy "Workspace members view campaign email samples"
  on public.campaign_email_samples
  for select
  to authenticated
  using ((select public.can_view_campaign_email_sample(workspace_id)));

drop policy if exists "Workspace managers insert campaign email samples"
  on public.campaign_email_samples;
create policy "Workspace managers insert campaign email samples"
  on public.campaign_email_samples
  for insert
  to authenticated
  with check ((select public.can_manage_campaign_email_sample(workspace_id)));

drop policy if exists "Workspace managers update campaign email samples"
  on public.campaign_email_samples;
create policy "Workspace managers update campaign email samples"
  on public.campaign_email_samples
  for update
  to authenticated
  using ((select public.can_manage_campaign_email_sample(workspace_id)))
  with check ((select public.can_manage_campaign_email_sample(workspace_id)));

drop policy if exists "Workspace managers delete campaign email samples"
  on public.campaign_email_samples;
create policy "Workspace managers delete campaign email samples"
  on public.campaign_email_samples
  for delete
  to authenticated
  using ((select public.can_manage_campaign_email_sample(workspace_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-email-samples',
  'campaign-email-samples',
  false,
  10485760,
  array['message/rfc822', 'application/eml', 'application/vnd.ms-outlook', 'application/msoutlook', 'application/octet-stream', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Workspace members read campaign email files"
  on storage.objects;
create policy "Workspace members read campaign email files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'campaign-email-samples'
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and (select public.can_view_campaign_email_sample((split_part(name, '/', 1))::uuid))
  );

drop policy if exists "Workspace managers upload campaign email files"
  on storage.objects;
create policy "Workspace managers upload campaign email files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'campaign-email-samples'
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and (select public.can_manage_campaign_email_sample((split_part(name, '/', 1))::uuid))
  );

drop policy if exists "Workspace managers update campaign email files"
  on storage.objects;
create policy "Workspace managers update campaign email files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'campaign-email-samples'
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and (select public.can_manage_campaign_email_sample((split_part(name, '/', 1))::uuid))
  )
  with check (
    bucket_id = 'campaign-email-samples'
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and (select public.can_manage_campaign_email_sample((split_part(name, '/', 1))::uuid))
  );

drop policy if exists "Workspace managers delete campaign email files"
  on storage.objects;
create policy "Workspace managers delete campaign email files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'campaign-email-samples'
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and (select public.can_manage_campaign_email_sample((split_part(name, '/', 1))::uuid))
  );
