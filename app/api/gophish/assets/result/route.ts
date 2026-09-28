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

  const rawBody = await request.text();
  if (rawBody.length > 1_100_000)
    return gophishError("Resposta protegida acima do limite permitido.", 413);
  const body = (await Promise.resolve()
    .then(() => JSON.parse(rawBody))
    .catch(() => null)) as {
    commandId?: unknown;
    status?: unknown;
    assetId?: unknown;
    message?: unknown;
    encryptedResult?: unknown;
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

  let encryptedResult: {
    version: 1;
    wrappedKey: string;
    iv: string;
    ciphertext: string;
  } | null = null;
  if (body.encryptedResult !== undefined && body.encryptedResult !== null) {
    const envelope = body.encryptedResult as Record<string, unknown>;
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      Array.isArray(envelope) ||
      envelope.version !== 1 ||
      typeof envelope.wrappedKey !== "string" ||
      envelope.wrappedKey.length > 4096 ||
      typeof envelope.iv !== "string" ||
      envelope.iv.length > 128 ||
      typeof envelope.ciphertext !== "string" ||
      envelope.ciphertext.length > 1_000_000 ||
      body.status !== "succeeded"
    )
      return gophishError("Resposta protegida do conector inválida.", 400);
    encryptedResult = {
      version: 1,
      wrappedKey: envelope.wrappedKey,
      iv: envelope.iv,
      ciphertext: envelope.ciphertext,
    };
  }

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
      p_encrypted_result: encryptedResult,
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
