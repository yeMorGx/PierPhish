import { NextRequest, NextResponse } from "next/server";
import {
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

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
  if (error)
    return gophishError("Não foi possível registrar a confirmação.", 502);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.command_id) {
    return gophishError(
      "Prévia expirada, já utilizada ou o nome digitado não corresponde à campanha.",
      409,
    );
  }
  return NextResponse.json(
    { commandId: row.command_id, status: row.command_status },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
