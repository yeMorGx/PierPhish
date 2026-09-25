create table if not exists public.pierphish_campaign_asset_commands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  connector_id uuid not null references public.pierphish_gophish_connectors(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_name text not null,
  asset_type text not null check (asset_type in ('group', 'template', 'page', 'sending_profile')),
  asset_name text not null check (char_length(asset_name) between 1 and 120),
  item_count integer not null default 0 check (item_count between 0 and 500),
  encrypted_payload jsonb not null check (jsonb_typeof(encrypted_payload) = 'object'),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'uncertain', 'expired')),
  queued_at timestamptz not null default now(),
  dispatch_expires_at timestamptz not null,
  claimed_at timestamptz,
  finished_at timestamptz,
  remote_asset_id bigint,
  result_message text
);

create index if not exists pierphish_campaign_asset_commands_workspace_idx
  on public.pierphish_campaign_asset_commands(workspace_id, queued_at desc);
create index if not exists pierphish_campaign_asset_commands_dispatch_idx
  on public.pierphish_campaign_asset_commands(connector_id, status, queued_at);

alter table public.pierphish_campaign_asset_commands enable row level security;
revoke all on table public.pierphish_campaign_asset_commands from anon, authenticated;
grant all on table public.pierphish_campaign_asset_commands to service_role;

comment on table public.pierphish_campaign_asset_commands is
  'Fila auditável de criação de ativos; conteúdo, destinatários e segredos seguem cifrados e são apagados ao concluir ou expirar.';

create or replace function public.claim_pierphish_campaign_asset_command(
  p_connector_id uuid
)
returns table(command_id uuid, command_type text, command_payload jsonb)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  queued_command public.pierphish_campaign_asset_commands%rowtype;
begin
  update public.pierphish_campaign_asset_commands as command
    set status = 'expired',
        finished_at = now(),
        encrypted_payload = '{}'::jsonb,
        result_message = 'Conector offline durante a janela de despacho.'
    where command.connector_id = p_connector_id
      and command.status = 'queued'
      and command.dispatch_expires_at <= now();

  update public.pierphish_campaign_asset_commands as command
    set status = 'uncertain',
        finished_at = now(),
        encrypted_payload = '{}'::jsonb,
        result_message = 'Tempo limite excedido. Confira o ativo no ambiente conectado antes de repetir.'
    where command.connector_id = p_connector_id
      and command.status = 'processing'
      and command.claimed_at < now() - interval '15 minutes';

  select * into queued_command
  from public.pierphish_campaign_asset_commands as candidate
  where candidate.connector_id = p_connector_id
    and candidate.status = 'queued'
    and candidate.dispatch_expires_at > now()
  order by candidate.queued_at
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update public.pierphish_campaign_asset_commands
    set status = 'processing', claimed_at = now()
    where id = queued_command.id;

  return query
    select queued_command.id, queued_command.asset_type, queued_command.encrypted_payload;
end;
$$;

create or replace function public.finish_pierphish_campaign_asset_command(
  p_connector_id uuid,
  p_command_id uuid,
  p_status text,
  p_asset_id bigint,
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

  update public.pierphish_campaign_asset_commands
    set status = p_status,
        finished_at = now(),
        remote_asset_id = case when p_status = 'succeeded' then p_asset_id else null end,
        result_message = left(coalesce(p_result_message, ''), 500),
        encrypted_payload = '{}'::jsonb
    where id = p_command_id
      and connector_id = p_connector_id
      and status = 'processing';
  return found;
end;
$$;

revoke all on function public.claim_pierphish_campaign_asset_command(uuid)
  from public, anon, authenticated;
revoke all on function public.finish_pierphish_campaign_asset_command(uuid, uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.claim_pierphish_campaign_asset_command(uuid)
  to service_role;
grant execute on function public.finish_pierphish_campaign_asset_command(uuid, uuid, text, bigint, text)
  to service_role;
