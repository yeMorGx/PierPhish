import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
import { requireMfa } from "@/lib/server-auth";
import { loadExcludedWorkspaceEmails } from "@/lib/server-statistics";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClient(key: string | undefined, accessToken?: string) {
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

function isGlobalAdmin(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
}) {
  const role =
    typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "";
  return (
    user.email?.toLowerCase() === superAdminEmail ||
    user.app_metadata?.is_admin === true ||
    ["admin", "owner", "super_admin"].includes(role)
  );
}

export async function GET(request: NextRequest) {
  const rawWorkspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "";
  const workspaceId =
    rawWorkspaceId === "primary" ? persistedPrimaryWorkspaceId : rawWorkspaceId;
  if (!workspaceId) return errorResponse("Workspace não informado.", 400);

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return errorResponse("Sessão não encontrada.", 401);

  const authClient = getClient(publishableKey ?? serviceRoleKey, token);
  if (!authClient) return errorResponse("Supabase não configurado.", 503);

  const mfaError = await requireMfa(authClient, token);
  if (mfaError) return mfaError;

  const { data, error: userError } = await authClient.auth.getUser(token);
  if (userError || !data.user) {
    return errorResponse("Sua sessão não é válida.", 401);
  }

  if (!isGlobalAdmin(data.user)) {
    const { data: membership, error: membershipError } = await authClient
      .from("pierphish_workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError) {
      return errorResponse("Não foi possível verificar o workspace.", 503);
    }
    if (!membership) {
      return errorResponse("Você não tem acesso a este workspace.", 403);
    }
  }

  const client = getClient(serviceRoleKey);
  if (!client)
    return errorResponse("Supabase não configurado no servidor.", 503);

  try {
    const emails = await loadExcludedWorkspaceEmails(client, workspaceId);
    return NextResponse.json({
      workspaceId: rawWorkspaceId || workspaceId,
      emails: Array.from(emails),
    });
  } catch {
    return errorResponse(
      "Não foi possível carregar as exclusões do workspace.",
      502,
    );
  }
}
