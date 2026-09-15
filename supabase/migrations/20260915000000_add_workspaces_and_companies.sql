create table if not exists public.pierphish_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  environment text not null default 'test' check (environment in ('test', 'production')),
  description text not null default '' check (char_length(description) <= 240),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pierphish_companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pierphish_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 240),
  client_id text not null check (char_length(client_id) between 2 and 180),
  client_secret_ciphertext text not null,
  client_secret_last4 text not null check (char_length(client_secret_last4) between 0 and 4),
  logo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pierphish_companies_workspace_id_idx
  on public.pierphish_companies(workspace_id);

alter table public.pierphish_workspaces enable row level security;
alter table public.pierphish_companies enable row level security;

revoke all on table public.pierphish_workspaces from anon, authenticated;
revoke all on table public.pierphish_companies from anon, authenticated;
grant all on table public.pierphish_workspaces to service_role;
grant all on table public.pierphish_companies to service_role;

comment on table public.pierphish_workspaces is
  'Workspaces internos do PierPhish; a criação não depende da API do BeePhish.';
comment on table public.pierphish_companies is
  'Clientes BeePhish por workspace; client_secret_ciphertext só é acessado server-side.';
