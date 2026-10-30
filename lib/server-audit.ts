import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditOutcome = "success" | "failure" | "partial" | "requested";

export type AuditMetadata = {
  delivery?: "link" | "email";
  role_before?: string;
  role_after?: string;
  excluded_before?: boolean;
  excluded_after?: boolean;
  email_sent?: boolean;
  recipient_count?: number;
  group_count?: number;
  asset_type?: string;
  item_count?: number;
  campaign_count?: number;
  company_count?: number;
  failure_count?: number;
  is_test?: boolean;
  changed_fields?: string;
};

export type AuditEvent = {
  workspaceId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | number | null;
  resourceName?: string | null;
  outcome: AuditOutcome;
  metadata?: AuditMetadata;
  idempotencyKey?: string | null;
};

const allowedMetadata = new Set([
  "delivery",
  "role_before",
  "role_after",
  "excluded_before",
  "excluded_after",
  "email_sent",
  "recipient_count",
  "group_count",
  "asset_type",
  "item_count",
  "campaign_count",
  "company_count",
  "failure_count",
  "is_test",
  "changed_fields",
]);

function safeMetadata(input: AuditMetadata | undefined) {
  if (!input) return {};
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedMetadata.has(key)) continue;
    if (typeof value === "string") result[key] = value.slice(0, 120);
    else if (typeof value === "boolean") result[key] = value;
    else if (typeof value === "number" && Number.isFinite(value))
      result[key] = value;
  }
  return result;
}

export async function recordAuditEvent(
  client: SupabaseClient,
  event: AuditEvent,
) {
  const row = {
    workspace_id: event.workspaceId ?? null,
    actor_user_id: event.actorUserId ?? null,
    actor_name: event.actorName?.trim().slice(0, 120) || null,
    action: event.action.slice(0, 80),
    resource_type: event.resourceType?.slice(0, 40) ?? null,
    resource_id:
      event.resourceId === null || event.resourceId === undefined
        ? null
        : String(event.resourceId).slice(0, 120),
    resource_name: event.resourceName?.trim().slice(0, 160) || null,
    outcome: event.outcome,
    metadata: safeMetadata(event.metadata),
    idempotency_key: event.idempotencyKey?.slice(0, 160) ?? null,
  };

  const result = event.idempotencyKey
    ? await client
        .from("pierphish_audit_events")
        .upsert(row, { onConflict: "idempotency_key", ignoreDuplicates: true })
    : await client.from("pierphish_audit_events").insert(row);

  if (result.error) {
    console.error("[audit] Event persistence failed", { action: event.action });
    return false;
  }
  return true;
}
