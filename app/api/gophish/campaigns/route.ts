import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!isWorkspaceId(workspaceId))
    return gophishError("Workspace inválido.", 400);
  const access = await requireGophishWorkspaceAccess(
    request,
    workspaceId,
    true,
  );
  if (access.error) return access.error;
  const { data, error } = await access.client
    .from("pierphish_gophish_campaign_commands")
    .select(
      "id,campaign_name,requested_by_name,selected_groups,recipient_count,template_name,landing_page_name,sending_profile_name,launch_at,send_by,status,queued_at,claimed_at,finished_at,gophish_campaign_id,result_message",
    )
    .eq("workspace_id", databaseWorkspaceId(workspaceId))
    .order("queued_at", { ascending: false })
    .limit(50);
  if (error)
    return gophishError("Não foi possível carregar as operações.", 502);
  return NextResponse.json(
    {
      operations: (data ?? []).map((row) => ({
        id: row.id,
        campaignName: row.campaign_name,
        requestedBy: row.requested_by_name,
        groups: row.selected_groups,
        recipientCount: row.recipient_count,
        template: row.template_name,
        page: row.landing_page_name,
        sendingProfile: row.sending_profile_name,
        launchAt: row.launch_at,
        sendBy: row.send_by,
        status: row.status,
        queuedAt: row.queued_at,
        claimedAt: row.claimed_at,
        finishedAt: row.finished_at,
        campaignId: row.gophish_campaign_id,
        result: row.result_message,
      })),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
