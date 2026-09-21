import { supabase } from "@/lib/supabase";

export function normalizeWorkspaceEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function loadWorkspaceExcludedEmails(workspaceId: string) {
  if (!supabase || !workspaceId) return new Set<string>();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return new Set<string>();

  const response = await fetch(
    `/api/workspaces/exclusions?workspaceId=${encodeURIComponent(workspaceId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) return new Set<string>();

  const body = (await response.json().catch(() => ({}))) as {
    emails?: unknown;
  };
  return new Set(
    Array.isArray(body.emails)
      ? body.emails
          .filter((email): email is string => typeof email === "string")
          .map(normalizeWorkspaceEmail)
      : [],
  );
}
