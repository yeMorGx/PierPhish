import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";
import { recordAuditEvent } from "@/lib/server-audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    workspaceId?: unknown;
    previewId?: unknown;
    confirmation?: unknown;
    accepted?: unknown;
  } | null;
  if (
    !body ||
    !isWorkspaceId(body.workspaceId) ||
    typeof body.previewId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.previewId) ||
    typeof body.confirmation !== "string" ||
    body.confirmation.length > 120 ||
    body.accepted !== true
  ) {
    return gophishError("Confirmação inválida.", 400);
  }
  const access = await requireGophishWorkspaceAccess(
    request,
    body.workspaceId,
    true,
  );
  if (access.error) return access.error;
  const { data, error } = await access.client.rpc(
    "confirm_pierphish_gophish_campaign",
    {
      p_preview_id: body.previewId,
      p_user_id: access.userId,
      p_confirmation: body.confirmation,
      p_accepted: body.accepted,
    },
  );
  if (error) {
    await recordAuditEvent(access.client, {
      workspaceId: databaseWorkspaceId(body.workspaceId),
      actorUserId: access.userId,
      actorName: access.userLabel,
      action: "campaign.confirmation_failed",
      resourceType: "campaign_preview",
      resourceId: body.previewId,
      resourceName: "Confirmação da campanha",
      outcome: "failure",
    });
    return gophishError("Não foi possível registrar a confirmação.", 502);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.command_id) {
    await recordAuditEvent(access.client, {
      workspaceId: databaseWorkspaceId(body.workspaceId),
      actorUserId: access.userId,
      actorName: access.userLabel,
      action: "campaign.confirmation_failed",
      resourceType: "campaign_preview",
      resourceId: body.previewId,
      resourceName: "Confirmação da campanha",
      outcome: "failure",
    });
    return gophishError(
      "Prévia expirada, já utilizada ou o nome digitado não corresponde à campanha.",
      409,
    );
  }
  const { data: command } = await access.client
    .from("pierphish_gophish_campaign_commands")
    .select(
      "workspace_id,requested_by_name,campaign_name,recipient_count,selected_groups",
    )
    .eq("id", row.command_id)
    .maybeSingle();
  const groupCount = Array.isArray(command?.selected_groups)
    ? command.selected_groups.length
    : undefined;
  await recordAuditEvent(access.client, {
    workspaceId: command?.workspace_id ?? databaseWorkspaceId(body.workspaceId),
    actorUserId: access.userId,
    actorName: command?.requested_by_name ?? access.userLabel,
    action: "campaign.confirmed",
    resourceType: "campaign",
    resourceId: row.command_id,
    resourceName: command?.campaign_name ?? "Campanha confirmada",
    outcome: "success",
    metadata: {
      ...(Number.isFinite(Number(command?.recipient_count))
        ? { recipient_count: Number(command?.recipient_count) }
        : {}),
      ...(groupCount !== undefined ? { group_count: groupCount } : {}),
    },
    idempotencyKey: `campaign-confirmed:${row.command_id}`,
  });
  return NextResponse.json(
    { commandId: row.command_id, status: row.command_status },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
