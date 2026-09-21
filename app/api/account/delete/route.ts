import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireMfa } from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    return responseError(
      "A administração da conta ainda não foi configurada no servidor.",
      503,
    );
  }

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);

  let payload: { currentPassword?: unknown; confirmation?: unknown };
  try {
    payload = (await request.json()) as {
      currentPassword?: unknown;
      confirmation?: unknown;
    };
  } catch {
    return responseError("Envie os dados de confirmação em JSON válido.", 400);
  }

  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const confirmation =
    typeof payload.confirmation === "string" ? payload.confirmation.trim() : "";
  if (confirmation !== "EXCLUIR") {
    return responseError(
      "Digite EXCLUIR para confirmar a exclusão da conta.",
      400,
    );
  }
  if (!currentPassword) {
    return responseError("Informe sua senha atual para continuar.", 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const mfaError = await requireMfa(adminClient, token);
  if (mfaError) return mfaError;

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user?.email) {
    return responseError("Sua sessão não é válida.", 401);
  }

  const verificationClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: passwordError } =
    await verificationClient.auth.signInWithPassword({
      email: data.user.email,
      password: currentPassword,
    });
  if (passwordError) {
    return responseError("A senha atual não confere.", 401);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    data.user.id,
  );
  if (deleteError) {
    return responseError("Não foi possível excluir sua conta.", 502);
  }

  return NextResponse.json({ ok: true });
}
