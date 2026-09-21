-- Workspace membership flag used to exclude internal people from campaign statistics.
alter table public.pierphish_workspace_members
  add column if not exists exclude_from_statistics boolean not null default false;

create index if not exists pierphish_workspace_members_statistics_exclusion_idx
  on public.pierphish_workspace_members(workspace_id, exclude_from_statistics)
  where exclude_from_statistics = true;

comment on column public.pierphish_workspace_members.exclude_from_statistics is
  'Indica se a pessoa deve ser excluída das estatísticas das campanhas.';

-- Keep the Beephish aggregate untouched so changing the exclusion flag can be
-- reflected immediately without requiring another remote synchronization.
alter table public.beephish_campaigns
  add column if not exists source_stats jsonb not null default '{}'::jsonb;

update public.beephish_campaigns
set source_stats = stats
where source_stats = '{}'::jsonb
  and stats <> '{}'::jsonb;

comment on column public.beephish_campaigns.source_stats is
  'Agregado original recebido da Beephish, antes das exclusões internas.';
