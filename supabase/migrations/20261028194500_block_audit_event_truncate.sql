begin;

drop trigger if exists pierphish_audit_events_immutable
  on public.pierphish_audit_events;
create trigger pierphish_audit_events_immutable
before update or delete or truncate on public.pierphish_audit_events
for each statement execute function public.reject_pierphish_audit_event_mutation();

commit;
