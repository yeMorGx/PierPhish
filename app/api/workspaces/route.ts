import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
import { identifyAikidoUser, requireMfa } from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";

type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClient(token: string) {
  const key = publishableKey ?? serviceRoleKey;
  if (!supabaseUrl || !key) return null;

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function isAdminUser(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
}) {
  const role =
    typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "";
  return (
    user.email?.toLowerCase() === superAdminEmail ||
    user.app_metadata?.is_admin === true ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin"
  );
}

function isLocalImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value)
  );
}

function safeWorkspace(row: Record<string, unknown>, role: WorkspaceRole) {
  const databaseId = String(row.id);
  return {
    id: databaseId === persistedPrimaryWorkspaceId ? "primary" : databaseId,
    name: String(row.name ?? "Workspace sem nome"),
    environment: row.environment === "production" ? "production" : "test",
    description: String(row.description ?? ""),
    logoUrl: isLocalImage(row.logo_url) ? row.logo_url : null,
    createdAt: String(row.created_at ?? ""),
    role,
  };
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);

  const client = getClient(token);
  if (!client) {
    return responseError("O Supabase não foi configurado no servidor.", 503);
  }

  const mfaError = await requireMfa(client, token);
  if (mfaError) return mfaError;

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return responseError("Sua sessão não é válida.", 401);
  }
  identifyAikidoUser(userData.user);

  const admin = isAdminUser(userData.user);
  const { data: membershipRows, error: membershipError } = await client
    .from("pierphish_workspace_members")
    .select("workspace_id,user_id,role,status")
    .eq(admin ? "status" : "user_id", admin ? "active" : userData.user.id)
    .eq("status", "active");

  if (membershipError) {
    return responseError(
      "A estrutura de acessos ainda não foi aplicada ao Supabase.",
      503,
    );
  }

  const memberships = (membershipRows ?? []) as Array<{
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
  }>;
  const workspaceIds = [
    ...new Set(memberships.map((item) => item.workspace_id)),
  ];
  if (!admin && workspaceIds.length === 0) {
    return NextResponse.json({ workspaces: [] });
  }

  let workspaceQuery = client
    .from("pierphish_workspaces")
    .select("id,name,environment,description,logo_url,created_at")
    .order("created_at", { ascending: true });
  if (!admin) workspaceQuery = workspaceQuery.in("id", workspaceIds);
  const { data: workspaceRows, error: workspaceError } = await workspaceQuery;

  if (workspaceError) {
    return responseError("Não foi possível carregar os workspaces.", 502);
  }

  const roleByWorkspace = new Map(
    memberships
      .filter((item) => item.user_id === userData.user.id)
      .map((item) => [item.workspace_id, item.role]),
  );

  return NextResponse.json({
    workspaces: (workspaceRows ?? []).map((row) =>
      safeWorkspace(
        row as Record<string, unknown>,
        roleByWorkspace.get(String(row.id)) ?? (admin ? "owner" : "viewer"),
      ),
    ),
  });
}
