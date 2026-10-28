begin;

alter table public.beephish_campaigns
  add column if not exists is_test boolean not null default false,
  add column if not exists test_marked_by uuid references auth.users(id) on delete set null,
  add column if not exists test_marked_at timestamptz;

create table if not exists public.pierphish_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  actor_user_id uuid,
  actor_name text check (actor_name is null or char_length(actor_name) <= 120),
  action text not null check (char_length(action) between 1 and 80),
  resource_type text check (resource_type is null or char_length(resource_type) <= 40),
  resource_id text check (resource_id is null or char_length(resource_id) <= 120),
  resource_name text check (resource_name is null or char_length(resource_name) <= 160),
  outcome text not null check (outcome in ('success', 'failure', 'partial', 'requested')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 2048),
  idempotency_key text unique check (idempotency_key is null or char_length(idempotency_key) <= 160),
  occurred_at timestamptz not null default now()
);

create index if not exists pierphish_audit_events_workspace_time_idx
  on public.pierphish_audit_events(workspace_id, occurred_at desc, id desc);
create index if not exists pierphish_audit_events_actor_time_idx
  on public.pierphish_audit_events(actor_user_id, occurred_at desc, id desc)
  where actor_user_id is not null;

alter table public.pierphish_audit_events enable row level security;
revoke all on table public.pierphish_audit_events from public, anon, authenticated;
grant all on table public.pierphish_audit_events to service_role;

comment on table public.pierphish_audit_events is
  'Append-only application audit events. Read/write is restricted to server-side service-role code after application authorization.';

create or replace function public.set_campaign_test_flag(p_campaign_id bigint, p_is_test boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_workspace uuid;
  campaign_name text;
  previous_is_test boolean;
  actor_name text;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Authenticated MFA session required' using errcode = '42501';
  end if;
  if p_is_test is null then
    raise exception 'Test flag is required' using errcode = '22023';
  end if;
  select workspace_id, name, is_test
    into campaign_workspace, campaign_name, previous_is_test
    from public.beephish_campaigns
    where id = p_campaign_id;
  if campaign_workspace is null or not coalesce(public.can_manage_campaign_email_sample(campaign_workspace), false) then
    raise exception 'Campaign access denied' using errcode = '42501';
  end if;
  update public.beephish_campaigns
    set is_test = p_is_test, test_marked_by = auth.uid(), test_marked_at = now()
    where id = p_campaign_id and workspace_id = campaign_workspace;

  if previous_is_test is distinct from p_is_test then
    actor_name := coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'display_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
      auth.jwt() ->> 'email'
    );
    insert into public.pierphish_audit_events (
      workspace_id, actor_user_id, actor_name, action, resource_type,
      resource_id, resource_name, outcome, metadata
    ) values (
      campaign_workspace, auth.uid(), left(actor_name, 120),
      case when p_is_test then 'campaign.test_marked' else 'campaign.test_unmarked' end,
      'campaign', p_campaign_id::text, left(campaign_name, 160), 'success',
      jsonb_build_object('is_test', p_is_test)
    );
  end if;
  return p_is_test;
end;
$$;

revoke all on function public.set_campaign_test_flag(bigint, boolean) from public, anon;
grant execute on function public.set_campaign_test_flag(bigint, boolean) to authenticated;

commit;
