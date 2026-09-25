import { NextRequest, NextResponse } from "next/server";
import {
  authenticateGophishConnector,
  gophishError,
} from "@/lib/server-gophish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authenticateGophishConnector(request);
  if (auth.error) return auth.error;
  if (!auth.client || !auth.connectorId)
    return gophishError("Credencial do conector inválida.", 401);

  const body = (await request.json().catch(() => null)) as {
    commandId?: unknown;
    status?: unknown;
    assetId?: unknown;
    message?: unknown;
  } | null;
  if (
    !body ||
    typeof body.commandId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.commandId) ||
    !["succeeded", "failed", "uncertain"].includes(String(body.status)) ||
    (body.assetId !== null &&
      body.assetId !== undefined &&
      (!Number.isSafeInteger(body.assetId) || Number(body.assetId) < 1))
  )
    return gophishError("Resultado do conector inválido.", 400);

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  const { data, error } = await auth.client.rpc(
    "finish_pierphish_campaign_asset_command",
    {
      p_connector_id: auth.connectorId,
      p_command_id: body.commandId,
      p_status: body.status,
      p_asset_id: body.assetId ? Number(body.assetId) : null,
      p_result_message: message,
    },
  );
  if (error)
    return gophishError("Não foi possível registrar o resultado.", 502);
  if (data !== true)
    return gophishError("Operação não encontrada ou já concluída.", 409);
  return NextResponse.json(
    { accepted: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
