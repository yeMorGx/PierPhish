import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Require password reauthentication before allowing first-factor MFA enrollment.
 * This prevents an attacker who has obtained a password-only session from
 * enrolling their own authenticator without the user's knowledge.
 */
export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    return responseError(
      "A autenticação ainda não foi configurada no servidor.",
      503,
    );
  }

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);

  let payload: { password?: unknown };
  try {
    payload = (await request.json()) as { password?: unknown };
  } catch {
    return responseError("Envie a senha em JSON válido.", 400);
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  if (!password) {
    return responseError("Informe sua senha para continuar.", 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get the user from the current session
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user?.email) {
    return responseError("Sua sessão não é válida.", 401);
  }

  // Verify the user must be at AAL1 (password-only) to use this endpoint
  const { data: claimsData } = await adminClient.auth.getClaims(token);
  const claims = claimsData?.claims as { aal?: unknown } | undefined;
  if (claims?.aal === "aal2") {
    return responseError(
      "Esta operação só é permitida antes da configuração do MFA.",
      403,
    );
  }

  // Check if user already has a verified factor
  const verificationClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: factorsData } = await verificationClient.auth.mfa.listFactors();
  const hasVerifiedFactor = Boolean(
    factorsData?.all?.some((factor) => factor.status === "verified"),
  );

  if (hasVerifiedFactor) {
    return responseError(
      "Você já possui um fator de autenticação configurado.",
      403,
    );
  }

  // Verify the password by attempting to sign in
  const passwordClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: passwordError } = await passwordClient.auth.signInWithPassword(
    {
      email: data.user.email,
      password,
    },
  );

  if (passwordError) {
    return responseError("Senha incorreta.", 401);
  }

  // Store a time-limited enrollment authorization in app_metadata
  const now = Date.now();
  const appMetadata = (data.user.app_metadata ?? {}) as Record<string, unknown>;

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        ...appMetadata,
        mfa_enrollment_authorized_at: now,
      },
    },
  );

  if (updateError) {
    return responseError(
      "Não foi possível autorizar a configuração do MFA.",
      502,
    );
  }

  return NextResponse.json({
    ok: true,
    authorizedAt: now,
  });
}
