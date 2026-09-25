import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    workspaceId?: unknown;
    connectorName?: unknown;
  } | null;
  if (!body || !isWorkspaceId(body.workspaceId)) {
    return gophishError("Workspace inválido.", 400);
  }

  const access = await requireGophishWorkspaceAccess(
    request,
    body.workspaceId,
    true,
  );
  if (access.error) return access.error;

  const connectorName =
    typeof body.connectorName === "string"
      ? body.connectorName.trim().slice(0, 80)
      : "Piersec campanhas";
  const pairingCode = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await access.client
    .from("pierphish_gophish_pairings")
    .insert({
      workspace_id: databaseWorkspaceId(body.workspaceId),
      created_by: access.userId,
      connector_name: connectorName || "Piersec campanhas",
      code_hash: createHash("sha256").update(pairingCode).digest("hex"),
      expires_at: expiresAt,
    });
  if (error) {
    return gophishError("Não foi possível criar o código de pareamento.", 502);
  }

  return NextResponse.json(
    { pairingCode, expiresAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
