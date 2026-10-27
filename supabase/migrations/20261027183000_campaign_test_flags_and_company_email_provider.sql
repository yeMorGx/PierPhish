alter table public.beephish_campaigns
  add column if not exists is_test boolean not null default false,
  add column if not exists test_marked_by uuid references auth.users(id) on delete set null,
  add column if not exists test_marked_at timestamptz;

alter table public.pierphish_companies
  add column if not exists email_provider text not null default 'unknown'
    check (email_provider in ('unknown', 'google_workspace', 'microsoft_exchange', 'other'));

-- A narrow mutation: callers cannot update campaign totals or workspace ownership.
create or replace function public.set_campaign_test_flag(p_campaign_id bigint, p_is_test boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_workspace uuid;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Authenticated MFA session required' using errcode = '42501';
  end if;
  if p_is_test is null then
    raise exception 'Test flag is required' using errcode = '22023';
  end if;
  select workspace_id into campaign_workspace
    from public.beephish_campaigns where id = p_campaign_id;
  if campaign_workspace is null or not coalesce(public.can_manage_campaign_email_sample(campaign_workspace), false) then
    raise exception 'Campaign access denied' using errcode = '42501';
  end if;
  update public.beephish_campaigns
    set is_test = p_is_test, test_marked_by = auth.uid(), test_marked_at = now()
    where id = p_campaign_id and workspace_id = campaign_workspace;
  return p_is_test;
end;
$$;

revoke all on function public.set_campaign_test_flag(bigint, boolean) from public, anon;
grant execute on function public.set_campaign_test_flag(bigint, boolean) to authenticated;

comment on column public.beephish_campaigns.is_test is 'Manual exclusion from operational metrics; names containing teste are also excluded by the application.';
comment on column public.pierphish_companies.email_provider is 'Client mail platform; does not alter sending credentials.';
