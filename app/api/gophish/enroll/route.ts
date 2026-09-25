import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { gophishError, gophishServiceClient } from "@/lib/server-gophish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    pairingCode?: unknown;
  } | null;
  if (
    typeof body?.pairingCode !== "string" ||
    !/^[A-Za-z0-9_-]{30,80}$/.test(body.pairingCode)
  ) {
    return gophishError("Código de pareamento inválido ou expirado.", 400);
  }

  const client = gophishServiceClient();
  if (!client)
    return gophishError("Conector não configurado no servidor.", 503);

  const connectorToken = randomBytes(32).toString("base64url");
  const { data, error } = await client.rpc("claim_pierphish_gophish_pairing", {
    p_code_hash: createHash("sha256").update(body.pairingCode).digest("hex"),
    p_token_hash: createHash("sha256").update(connectorToken).digest("hex"),
  });
  if (error) {
    return gophishError("Não foi possível concluir o pareamento.", 502);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.connector_id) {
    return gophishError("Código de pareamento inválido ou expirado.", 401);
  }

  return NextResponse.json(
    { connectorToken, connectorId: row.connector_id },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
