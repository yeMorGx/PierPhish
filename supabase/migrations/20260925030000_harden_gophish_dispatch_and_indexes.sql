create index if not exists pierphish_gophish_pairings_workspace_idx
  on public.pierphish_gophish_pairings(workspace_id);
create index if not exists pierphish_gophish_pairings_created_by_idx
  on public.pierphish_gophish_pairings(created_by)
  where created_by is not null;
create index if not exists pierphish_gophish_connectors_created_by_idx
  on public.pierphish_gophish_connectors(created_by)
  where created_by is not null;
create index if not exists pierphish_gophish_campaign_previews_connector_idx
  on public.pierphish_gophish_campaign_previews(connector_id);
create index if not exists pierphish_gophish_campaign_previews_requested_by_idx
  on public.pierphish_gophish_campaign_previews(requested_by)
  where requested_by is not null;
create index if not exists pierphish_gophish_campaign_commands_requested_by_idx
  on public.pierphish_gophish_campaign_commands(requested_by)
  where requested_by is not null;

create or replace function public.claim_pierphish_gophish_pairing(
  p_code_hash text,
  p_token_hash text
)
returns table(connector_id uuid, workspace_id uuid, connector_name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pairing public.pierphish_gophish_pairings%rowtype;
  created_connector_id uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$' or p_token_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  select * into pairing
  from public.pierphish_gophish_pairings as candidate
  where candidate.code_hash = p_code_hash
    and candidate.used_at is null
    and candidate.expires_at > now()
  for update;

  if not found then
    return;
  end if;

  update public.pierphish_gophish_pairings
    set used_at = now()
    where id = pairing.id;

  insert into public.pierphish_gophish_connectors (
    workspace_id, created_by, name, token_hash
  ) values (
    pairing.workspace_id, pairing.created_by, pairing.connector_name, p_token_hash
  ) returning id into created_connector_id;

  return query
    select created_connector_id, pairing.workspace_id, pairing.connector_name;
end;
$$;

revoke all on function public.claim_pierphish_gophish_pairing(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_pierphish_gophish_pairing(text, text)
  to service_role;
