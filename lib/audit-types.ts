export type AuditLogItem = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  actorPhoto?: string | null;
  type?: string;
  status?: string;
  finishedAt?: string | null;
  href?: string;
};
