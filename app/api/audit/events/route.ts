import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordAuditEvent } from "@/lib/server-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const authActions = {
  "auth.login_succeeded": "success",
  "auth.logout": "requested",
  "auth.password_changed": "success",
  "auth.mfa_enabled": "success",
  "auth.mfa_verified": "success",
  "auth.mfa_verification_failed": "failure",
} as const;
const authActionNames: Record<keyof typeof authActions, string> = {
  "auth.login_succeeded": "Sessão iniciada",
  "auth.logout": "Saída solicitada",
  "auth.password_changed": "Senha alterada",
  "auth.mfa_enabled": "MFA ativado",
  "auth.mfa_verified": "MFA confirmado",
  "auth.mfa_verification_failed": "Falha na verificação MFA",
};

function actorName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  const displayName =
    typeof metadata.display_name === "string"
      ? metadata.display_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";
  return displayName || user.email || null;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Auditoria indisponível." },
      { status: 503 },
    );
  }
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
  } | null;
  if (
    !body ||
    typeof body.action !== "string" ||
    !Object.prototype.hasOwnProperty.call(authActions, body.action)
  ) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Sua sessão não é válida." },
      { status: 401 },
    );
  }
  const { data: claimsData, error: claimsError } =
    await client.auth.getClaims(token);
  const claims = claimsData?.claims as
    { aal?: unknown; iat?: unknown; session_id?: unknown } | undefined;
  if (claimsError || !claims) {
    return NextResponse.json(
      { error: "Sua sessão não é válida." },
      { status: 401 },
    );
  }

  const action = body.action as keyof typeof authActions;
  let eventReference = "";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuedAt = Number(claims.iat);
  if (action === "auth.login_succeeded") {
    if (
      !Number.isFinite(issuedAt) ||
      nowSeconds - issuedAt > 180 ||
      issuedAt > nowSeconds + 30
    ) {
      return NextResponse.json(
        {
          error: "A sessão não é recente o bastante para registrar a entrada.",
        },
        { status: 409 },
      );
    }
    eventReference = String(claims.session_id ?? "");
  }
  if (action === "auth.mfa_enabled" || action === "auth.mfa_verified") {
    if (claims.aal !== "aal2") {
      return NextResponse.json(
        { error: "A verificação multifator não foi confirmada." },
        { status: 409 },
      );
    }
    if (action === "auth.mfa_enabled") {
      const { data: factorData, error: factorError } =
        await client.auth.admin.mfa.listFactors({ userId: data.user.id });
      const verifiedFactor = factorData?.factors.find(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "verified",
      );
      if (factorError || !verifiedFactor) {
        return NextResponse.json(
          { error: "Não há um fator MFA confirmado para esta conta." },
          { status: 409 },
        );
      }
      eventReference = verifiedFactor.id;
    } else {
      eventReference = String(claims.session_id ?? "");
    }
  }
  if (action === "auth.mfa_verification_failed" && claims.aal !== "aal1") {
    return NextResponse.json(
      { error: "A sessão não corresponde a uma tentativa MFA pendente." },
      { status: 409 },
    );
  }
  if (action === "auth.password_changed") {
    const { data: latestUser, error: latestUserError } =
      await client.auth.admin.getUserById(data.user.id);
    const updatedAt = Date.parse(latestUser.user?.updated_at ?? "");
    const ageMs = Date.now() - updatedAt;
    if (
      latestUserError ||
      !Number.isFinite(updatedAt) ||
      ageMs < -30_000 ||
      ageMs > 5 * 60_000
    ) {
      return NextResponse.json(
        { error: "A alteração de senha não pôde ser confirmada." },
        { status: 409 },
      );
    }
    eventReference = String(latestUser.user?.updated_at ?? "");
  }
  if (action === "auth.logout")
    eventReference = String(claims.session_id ?? "");
  if (action === "auth.mfa_verification_failed") {
    eventReference = String(Math.floor(Date.now() / 60_000));
  }
  const idempotencyKey = eventReference
    ? `auth:${createHash("sha256")
        .update(`${action}:${data.user.id}:${eventReference}`)
        .digest("hex")}`
    : undefined;
  await recordAuditEvent(client, {
    actorUserId: data.user.id,
    actorName: actorName(data.user),
    action,
    resourceType: "authentication",
    resourceName: authActionNames[action],
    outcome: authActions[action],
    idempotencyKey,
  });

  return NextResponse.json(
    { ok: true },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
