create index if not exists pierphish_campaign_asset_commands_requested_by_idx
  on public.pierphish_campaign_asset_commands(requested_by)
  where requested_by is not null;
