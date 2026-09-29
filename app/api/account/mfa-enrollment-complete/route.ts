import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Clean up the enrollment authorization timestamp after successful MFA setup.
 * This is a non-critical cleanup operation.
 */
export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError(
      "A autenticação ainda não foi configurada no servidor.",
      503,
    );
  }

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return responseError("Sua sessão não é válida.", 401);
  }

  const appMetadata = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const { mfa_enrollment_authorized_at, ...remainingMetadata } = appMetadata;

  // Only update if the field exists
  if (mfa_enrollment_authorized_at !== undefined) {
    await adminClient.auth.admin.updateUserById(data.user.id, {
      app_metadata: remainingMetadata,
    });
  }

  return NextResponse.json({ ok: true });
}
