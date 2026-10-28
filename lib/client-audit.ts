export type ClientAuditAction =
  | "auth.login_succeeded"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.mfa_enabled"
  | "auth.mfa_verified"
  | "auth.mfa_verification_failed";

export function recordClientAuditAction(
  accessToken: string,
  action: ClientAuditAction,
) {
  void fetch("/api/audit/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
    cache: "no-store",
    keepalive: true,
  }).catch(() => undefined);
}
