import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
import { identifyAikidoUser, requireMfa } from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const globalAdminEmail = "admin@teste.com";

export function gophishError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

export function gophishServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function databaseWorkspaceId(workspaceId: string) {
  return workspaceId === "primary" ? persistedPrimaryWorkspaceId : workspaceId;
}

export function isWorkspaceId(value: unknown): value is string {
  return (
    value === "primary" ||
    (typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ))
  );
}

export async function requireGophishWorkspaceAccess(
  request: NextRequest,
  workspaceId: string,
  managerOnly = false,
): Promise<
  | { client: SupabaseClient; userId: string; error?: never }
  | { client?: never; userId?: never; error: NextResponse }
> {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const authKey = publishableKey ?? serviceRoleKey;
  if (!token || !supabaseUrl || !authKey) {
    return { error: gophishError("Sessão não encontrada.", 401) };
  }

  const authClient = createClient(supabaseUrl, authKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const mfaError = await requireMfa(authClient, token);
  if (mfaError) return { error: mfaError };

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: gophishError("Sua sessão não é válida.", 401) };
  }
  identifyAikidoUser(data.user);

  const metadata = data.user.app_metadata as
    { role?: unknown; is_admin?: unknown } | undefined;
  const role = typeof metadata?.role === "string" ? metadata.role : "";
  let isAdmin =
    data.user.email?.toLowerCase() === globalAdminEmail ||
    metadata?.is_admin === true ||
    ["admin", "owner", "super_admin"].includes(role.toLowerCase());
  if (!isAdmin) {
    const adminResult = await authClient.rpc("is_internal_admin");
    isAdmin = !adminResult.error && adminResult.data === true;
  }

  if (!isAdmin) {
    let membershipQuery = authClient
      .from("pierphish_workspace_members")
      .select("role")
      .eq("workspace_id", databaseWorkspaceId(workspaceId))
      .eq("user_id", data.user.id)
      .eq("status", "active");
    if (managerOnly)
      membershipQuery = membershipQuery.in("role", ["owner", "admin"]);
    const { data: membership, error: membershipError } =
      await membershipQuery.maybeSingle();
    if (membershipError) {
      return {
        error: gophishError(
          "Não foi possível verificar o acesso ao workspace.",
          503,
        ),
      };
    }
    if (!membership) {
      return {
        error: gophishError(
          managerOnly
            ? "Somente proprietários e administradores podem parear o conector."
            : "Você não tem acesso a este workspace.",
          403,
        ),
      };
    }
  }

  const client = gophishServiceClient();
  if (!client) {
    return {
      error: gophishError(
        "O Supabase precisa de SUPABASE_SERVICE_ROLE_KEY para armazenar o pareamento.",
        503,
      ),
    };
  }
  return { client, userId: data.user.id };
}
