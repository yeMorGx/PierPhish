begin;

alter table public.pierphish_audit_events
  drop constraint if exists pierphish_audit_events_workspace_id_fkey,
  drop constraint if exists pierphish_audit_events_actor_user_id_fkey;

commit;
