begin;

create or replace function public.reject_pierphish_audit_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit events are immutable' using errcode = '55000';
end;
$$;

revoke all on function public.reject_pierphish_audit_event_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists pierphish_audit_events_immutable
  on public.pierphish_audit_events;
create trigger pierphish_audit_events_immutable
before update or delete or truncate on public.pierphish_audit_events
for each statement execute function public.reject_pierphish_audit_event_mutation();

comment on function public.reject_pierphish_audit_event_mutation() is
  'Rejects mutation of PierSec audit events so application service-role writes remain append-only.';

commit;
