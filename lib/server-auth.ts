import { NextRequest, NextResponse } from "next/server";
import { setUser } from "@aikidosec/firewall";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getBearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

/**
 * Associate the authenticated Supabase user with the current Zen request.
 * Only the stable Supabase ID is sent; email and display name are intentionally
 * omitted to avoid sending unnecessary personal data to Aikido.
 */
export function identifyAikidoUser(user: { id: string }) {
  if (!process.env.AIKIDO_TOKEN) return;
  setUser({ id: user.id });
}

/**
 * MFA is enforced with the Authenticator Assurance Level in the access token.
 * AAL2 means Supabase has verified a second factor for the current session.
 */
export async function requireMfa(client: SupabaseClient, token: string) {
  const { data, error } = await client.auth.getClaims(token);
  const claims = data?.claims as { aal?: unknown } | undefined;

  if (error || claims?.aal !== "aal2") {
    return NextResponse.json(
      {
        error: "MFA obrigatório. Conclua a verificação em duas etapas.",
        code: "mfa_required",
      },
      { status: 403 },
    );
  }

  return null;
}
