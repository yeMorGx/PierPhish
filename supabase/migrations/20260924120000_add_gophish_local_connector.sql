create table if not exists public.pierphish_gophish_pairings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  connector_name text not null default 'GoPhish local'
    check (char_length(connector_name) between 1 and 80),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pierphish_gophish_pairings_expiration_idx
  on public.pierphish_gophish_pairings(expires_at);

create table if not exists public.pierphish_gophish_connectors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'GoPhish local'
    check (char_length(name) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null default '{"updatedAt":"","groups":[],"campaigns":[]}'::jsonb,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pierphish_gophish_connectors_workspace_idx
  on public.pierphish_gophish_connectors(workspace_id);

alter table public.pierphish_gophish_pairings enable row level security;
alter table public.pierphish_gophish_connectors enable row level security;

revoke all on table public.pierphish_gophish_pairings from anon, authenticated;
revoke all on table public.pierphish_gophish_connectors from anon, authenticated;
grant all on table public.pierphish_gophish_pairings to service_role;
grant all on table public.pierphish_gophish_connectors to service_role;

comment on table public.pierphish_gophish_pairings is
  'Códigos de uso único e hash-only para parear conectores GoPhish locais.';
comment on table public.pierphish_gophish_connectors is
  'Conectores GoPhish locais; guarda apenas hash do token e metadados agregados sem PII.';

create or replace function public.claim_pierphish_gophish_pairing(
  p_code_hash text,
  p_token_hash text
)
returns table(connector_id uuid, workspace_id uuid, connector_name text)
language plpgsql
security definer
set search_path = public
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
    workspace_id,
    created_by,
    name,
    token_hash
  ) values (
    pairing.workspace_id,
    pairing.created_by,
    pairing.connector_name,
    p_token_hash
  ) returning id into created_connector_id;

  return query
    select created_connector_id, pairing.workspace_id, pairing.connector_name;
end;
$$;

revoke all on function public.claim_pierphish_gophish_pairing(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_pierphish_gophish_pairing(text, text)
  to service_role;
