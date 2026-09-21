import type { SupabaseClient } from "@supabase/supabase-js";

type Stats = Record<string, unknown>;

export type StatisticsResult = {
  email?: string | null;
  status?: string | null;
  reported?: boolean | null;
};

function normalizedEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizedStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isExcluded(value: unknown, excludedEmails: Set<string>) {
  const email = normalizedEmail(value);
  return Boolean(email && excludedEmails.has(email));
}

function isNotDelivered(status: string) {
  return status.includes("not delivered") || status.includes("não entregue");
}

function isSending(status: string) {
  return status === "sending" || status === "enviando";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Returns the emails of active workspace members marked as internal.
 * This runs with the server-side service-role client only; auth user data is
 * never exposed directly to the browser.
 */
export async function loadExcludedWorkspaceEmails(
  client: SupabaseClient,
  workspaceId: string,
) {
  const { data: memberships, error: membershipError } = await client
    .from("pierphish_workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .eq("exclude_from_statistics", true);

  if (membershipError) throw membershipError;
  const userIds = new Set(
    (memberships ?? []).map((membership) => String(membership.user_id)),
  );
  if (!userIds.size) return new Set<string>();

  const { data, error: usersError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) throw usersError;

  return new Set(
    (data.users ?? [])
      .filter((user) => userIds.has(user.id))
      .map((user) => normalizedEmail(user.email))
      .filter(Boolean),
  );
}

/**
 * Keeps the original Beephish aggregate and subtracts only the people marked
 * as internal. That prevents a flag change from forcing a new API sync.
 */
export function adjustCampaignStats(
  sourceStats: unknown,
  results: StatisticsResult[],
  excludedEmails: Set<string>,
) {
  const stats: Stats =
    sourceStats && typeof sourceStats === "object"
      ? { ...(sourceStats as Stats) }
      : {};
  const excludedResults = results.filter((result) =>
    isExcluded(result.email, excludedEmails),
  );
  if (!excludedResults.length) return stats;

  const subtract = {
    total: excludedResults.length,
    sent: excludedResults.filter(
      (result) => !isSending(normalizedStatus(result.status)),
    ).length,
    delivered: excludedResults.filter(
      (result) => !isNotDelivered(normalizedStatus(result.status)),
    ).length,
    opened: excludedResults.filter((result) => {
      const status = normalizedStatus(result.status);
      return (
        status.includes("opened") ||
        status.includes("clicked") ||
        status.includes("submitted")
      );
    }).length,
    clicked: excludedResults.filter((result) => {
      const status = normalizedStatus(result.status);
      return status.includes("clicked") || status.includes("submitted");
    }).length,
    submitted_data: excludedResults.filter((result) =>
      normalizedStatus(result.status).includes("submitted"),
    ).length,
    email_reported: excludedResults.filter((result) => result.reported === true)
      .length,
    error: excludedResults.filter((result) =>
      isNotDelivered(normalizedStatus(result.status)),
    ).length,
  };

  for (const [key, amount] of Object.entries(subtract)) {
    const current = numberValue(stats[key]);
    if (current !== null) stats[key] = Math.max(0, current - amount);
  }
  return stats;
}

/** Rebuilds visible aggregates for a workspace after a person is flagged. */
export async function recalculateWorkspaceCampaignStats(
  client: SupabaseClient,
  workspaceId: string,
) {
  const excludedEmails = await loadExcludedWorkspaceEmails(client, workspaceId);
  const { data: campaigns, error: campaignError } = await client
    .from("beephish_campaigns")
    .select("id,source_stats,stats")
    .eq("workspace_id", workspaceId)
    .limit(10000);
  if (campaignError) throw campaignError;
  if (!campaigns?.length) return;

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data: results, error: resultError } = await client
    .from("beephish_results")
    .select("campaign_id,email,status,reported")
    .eq("workspace_id", workspaceId)
    .in("campaign_id", campaignIds)
    .limit(10000);
  if (resultError) throw resultError;

  const resultsByCampaign = new Map<number, StatisticsResult[]>();
  for (const result of results ?? []) {
    const current = resultsByCampaign.get(Number(result.campaign_id)) ?? [];
    current.push(result);
    resultsByCampaign.set(Number(result.campaign_id), current);
  }

  for (const campaign of campaigns) {
    const sourceStats =
      campaign.source_stats && Object.keys(campaign.source_stats).length
        ? campaign.source_stats
        : campaign.stats;
    const stats = adjustCampaignStats(
      sourceStats,
      resultsByCampaign.get(Number(campaign.id)) ?? [],
      excludedEmails,
    );
    const { error } = await client
      .from("beephish_campaigns")
      .update({ stats })
      .eq("id", campaign.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  }
}
