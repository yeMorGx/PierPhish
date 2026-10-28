export type AuditLogItem = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  type?: string;
  status?: string;
  finishedAt?: string | null;
  href?: string;
};
