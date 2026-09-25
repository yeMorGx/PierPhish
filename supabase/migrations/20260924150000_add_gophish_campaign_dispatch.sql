create table if not exists public.pierphish_gophish_campaign_previews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  connector_id uuid not null references public.pierphish_gophish_connectors(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_name text not null,
  campaign_name text not null check (char_length(campaign_name) between 1 and 120),
  selected_groups jsonb not null,
  recipient_count bigint not null check (recipient_count > 0),
  template_name text not null,
  landing_page_name text not null,
  sending_profile_name text not null,
  launch_at timestamptz,
  send_by timestamptz,
  payload jsonb not null,
  status text not null default 'awaiting_confirmation'
    check (status in ('awaiting_confirmation', 'queued', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz
);

create index if not exists pierphish_gophish_campaign_previews_workspace_idx
  on public.pierphish_gophish_campaign_previews(workspace_id, created_at desc);

create table if not exists public.pierphish_gophish_campaign_commands (
  id uuid primary key default gen_random_uuid(),
  preview_id uuid not null unique references public.pierphish_gophish_campaign_previews(id) on delete restrict,
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  connector_id uuid not null references public.pierphish_gophish_connectors(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_name text not null,
  campaign_name text not null,
  selected_groups jsonb not null,
  recipient_count bigint not null check (recipient_count > 0),
  template_name text not null,
  landing_page_name text not null,
  sending_profile_name text not null,
  launch_at timestamptz,
  send_by timestamptz,
  payload jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'uncertain', 'expired')),
  queued_at timestamptz not null default now(),
  dispatch_expires_at timestamptz not null,
  claimed_at timestamptz,
  finished_at timestamptz,
  gophish_campaign_id bigint,
  result_message text
);

create index if not exists pierphish_gophish_campaign_commands_workspace_idx
  on public.pierphish_gophish_campaign_commands(workspace_id, queued_at desc);
create index if not exists pierphish_gophish_campaign_commands_dispatch_idx
  on public.pierphish_gophish_campaign_commands(connector_id, status, queued_at);

alter table public.pierphish_gophish_campaign_previews enable row level security;
alter table public.pierphish_gophish_campaign_commands enable row level security;
revoke all on table public.pierphish_gophish_campaign_previews from anon, authenticated;
revoke all on table public.pierphish_gophish_campaign_commands from anon, authenticated;
grant all on table public.pierphish_gophish_campaign_previews to service_role;
grant all on table public.pierphish_gophish_campaign_commands to service_role;

comment on table public.pierphish_gophish_campaign_previews is
  'Prévia curta e auditável de campanhas GoPhish; não dispara operações.';
comment on table public.pierphish_gophish_campaign_commands is
  'Fila de lançamento explicitamente confirmado; comando local de uso único e resultado auditado.';

create or replace function public.confirm_pierphish_gophish_campaign(
  p_preview_id uuid,
  p_user_id uuid,
  p_confirmation text,
  p_accepted boolean
)
returns table(command_id uuid, command_status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  preview public.pierphish_gophish_campaign_previews%rowtype;
  created_command_id uuid;
begin
  select * into preview
  from public.pierphish_gophish_campaign_previews as candidate
  where candidate.id = p_preview_id
    and candidate.requested_by = p_user_id
    and candidate.status = 'awaiting_confirmation'
  for update;

  if not found then
    return;
  end if;
  if preview.expires_at <= now() then
    update public.pierphish_gophish_campaign_previews
      set status = 'expired'
      where id = preview.id;
    return;
  end if;
  if p_confirmation is distinct from preview.campaign_name or p_accepted is distinct from true then
    return;
  end if;

  insert into public.pierphish_gophish_campaign_commands (
    preview_id, workspace_id, connector_id, requested_by, requested_by_name, campaign_name,
    selected_groups, recipient_count, template_name, landing_page_name,
    sending_profile_name, launch_at, send_by, payload, dispatch_expires_at
  ) values (
    preview.id, preview.workspace_id, preview.connector_id, preview.requested_by, preview.requested_by_name,
    preview.campaign_name, preview.selected_groups, preview.recipient_count,
    preview.template_name, preview.landing_page_name, preview.sending_profile_name,
    preview.launch_at, preview.send_by, preview.payload, now() + interval '10 minutes'
  ) returning id into created_command_id;

  update public.pierphish_gophish_campaign_previews
    set status = 'queued', confirmed_at = now()
    where id = preview.id;

  return query select created_command_id, 'queued'::text;
end;
$$;

create or replace function public.claim_pierphish_gophish_campaign_command(
  p_connector_id uuid
)
returns table(command_id uuid, command_payload jsonb)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  queued_command public.pierphish_gophish_campaign_commands%rowtype;
begin
  update public.pierphish_gophish_campaign_commands as command
    set status = 'expired', finished_at = now(), result_message = 'Conector offline durante a janela de despacho.'
    where command.connector_id = p_connector_id
      and command.status = 'queued'
      and command.dispatch_expires_at <= now();

  select * into queued_command
  from public.pierphish_gophish_campaign_commands as candidate
  where candidate.connector_id = p_connector_id
    and candidate.status = 'queued'
    and candidate.dispatch_expires_at > now()
  order by candidate.queued_at
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;
  update public.pierphish_gophish_campaign_commands
    set status = 'processing', claimed_at = now()
    where id = queued_command.id;
  return query select queued_command.id, queued_command.payload;
end;
$$;

create or replace function public.finish_pierphish_gophish_campaign_command(
  p_connector_id uuid,
  p_command_id uuid,
  p_status text,
  p_campaign_id bigint,
  p_result_message text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('succeeded', 'failed', 'uncertain') then
    return false;
  end if;
  update public.pierphish_gophish_campaign_commands
    set status = p_status,
        finished_at = now(),
        gophish_campaign_id = case when p_status = 'succeeded' then p_campaign_id else null end,
        result_message = left(coalesce(p_result_message, ''), 500)
    where id = p_command_id
      and connector_id = p_connector_id
      and status = 'processing';
  return found;
end;
$$;

revoke all on function public.confirm_pierphish_gophish_campaign(uuid, uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function public.claim_pierphish_gophish_campaign_command(uuid)
  from public, anon, authenticated;
revoke all on function public.finish_pierphish_gophish_campaign_command(uuid, uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.confirm_pierphish_gophish_campaign(uuid, uuid, text, boolean)
  to service_role;
grant execute on function public.claim_pierphish_gophish_campaign_command(uuid)
  to service_role;
grant execute on function public.finish_pierphish_gophish_campaign_command(uuid, uuid, text, bigint, text)
  to service_role;
