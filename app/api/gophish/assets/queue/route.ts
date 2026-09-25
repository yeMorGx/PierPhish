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

  const { data, error } = await auth.client.rpc(
    "claim_pierphish_campaign_asset_command",
    { p_connector_id: auth.connectorId },
  );
  if (error)
    return gophishError("Não foi possível consultar a fila de operações.", 502);
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    row?.command_id
      ? {
          commandId: row.command_id,
          type: row.command_type,
          payload: row.command_payload,
        }
      : { commandId: null, type: null, payload: null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
