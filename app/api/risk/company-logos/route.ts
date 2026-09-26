import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { databaseWorkspaceId } from "@/lib/server-gophish";
import {
  getBearerToken,
  identifyAikidoUser,
  requireMfa,
} from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClient(key: string | undefined, token?: string) {
  if (!supabaseUrl || !key) return null;

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
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

function isLocalImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value)
  );
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return responseError("Sessão não encontrada.", 401);

  const authClient = getClient(publishableKey ?? serviceRoleKey, token);
  if (!authClient) {
    return responseError("O Supabase não foi configurado no servidor.", 503);
  }

  const mfaError = await requireMfa(authClient, token);
  if (mfaError) return mfaError;

  const { data: userData, error: userError } =
    await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return responseError("Sua sessão não é válida.", 401);
  }
  identifyAikidoUser(userData.user);

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
  if (!workspaceId) {
    return responseError("Workspace não informado.", 400);
  }

  const databaseId = databaseWorkspaceId(workspaceId);
  if (!isGlobalAdmin(userData.user)) {
    const { data: membership, error: membershipError } = await authClient
      .from("pierphish_workspace_members")
      .select("user_id")
      .eq("workspace_id", databaseId)
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      return responseError(
        "Não foi possível verificar o acesso ao workspace.",
        503,
      );
    }
    if (!membership) {
      return responseError("Você não tem acesso a este workspace.", 403);
    }
  }

  const serviceClient = getClient(serviceRoleKey);
  if (!serviceClient) {
    return responseError("O serviço de empresas não está configurado.", 503);
  }

  const { data, error } = await serviceClient
    .from("pierphish_companies")
    .select("id,name,logo_url")
    .eq("workspace_id", databaseId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    return responseError("Não foi possível carregar as empresas.", 502);
  }

  return NextResponse.json({
    companies: (data ?? []).map((company) => ({
      id: String(company.id),
      name: String(company.name ?? "Empresa"),
      logoUrl: isLocalImage(company.logo_url) ? company.logo_url : null,
    })),
  });
}
