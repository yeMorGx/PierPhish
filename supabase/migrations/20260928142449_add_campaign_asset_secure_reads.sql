alter table public.pierphish_campaign_asset_commands
  add column if not exists encrypted_result jsonb not null default '{}'::jsonb;

alter table public.pierphish_campaign_asset_commands
  drop constraint if exists pierphish_campaign_asset_commands_asset_type_check;

alter table public.pierphish_campaign_asset_commands
  add constraint pierphish_campaign_asset_commands_asset_type_check
  check (asset_type in (
    'group', 'template', 'page', 'sending_profile', 'campaign_results'
  ));

alter table public.pierphish_campaign_asset_commands
  drop constraint if exists pierphish_campaign_asset_commands_encrypted_result_check;

alter table public.pierphish_campaign_asset_commands
  add constraint pierphish_campaign_asset_commands_encrypted_result_check
  check (jsonb_typeof(encrypted_result) = 'object');

drop function if exists public.finish_pierphish_campaign_asset_command(
  uuid, uuid, text, bigint, text
);

create or replace function public.finish_pierphish_campaign_asset_command(
  p_connector_id uuid,
  p_command_id uuid,
  p_status text,
  p_asset_id bigint,
  p_result_message text,
  p_encrypted_result jsonb default '{}'::jsonb
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
  if p_encrypted_result is not null and jsonb_typeof(p_encrypted_result) <> 'object' then
    return false;
  end if;

  update public.pierphish_campaign_asset_commands
    set status = p_status,
        finished_at = now(),
        remote_asset_id = case when p_status = 'succeeded' then p_asset_id else null end,
        result_message = left(coalesce(p_result_message, ''), 500),
        encrypted_result = case
          when p_status = 'succeeded' then coalesce(p_encrypted_result, '{}'::jsonb)
          else '{}'::jsonb
        end,
        encrypted_payload = '{}'::jsonb
    where id = p_command_id
      and connector_id = p_connector_id
      and status = 'processing';
  return found;
end;
$$;

revoke all on function public.finish_pierphish_campaign_asset_command(
  uuid, uuid, text, bigint, text, jsonb
) from public, anon, authenticated;
grant execute on function public.finish_pierphish_campaign_asset_command(
  uuid, uuid, text, bigint, text, jsonb
) to service_role;
