import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireMfa } from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = "campaign-email-samples";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isGlobalAdminUser(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
}) {
  const role =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : "";
  return (
    user.email?.toLowerCase() === "admin@teste.com" ||
    user.app_metadata?.is_admin === true ||
    ["admin", "owner", "super_admin"].includes(role)
  );
}

async function listStoragePaths(
  client: SupabaseClient,
  prefix = "",
): Promise<string[]> {
  const { data, error } = await client.storage
    .from(bucketName)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) paths.push(...(await listStoragePaths(client, path)));
    else paths.push(path);
  }
  return paths;
}

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return responseError("Supabase não configurado no servidor.", 503);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const mfaError = await requireMfa(authClient, token);
  if (mfaError) return mfaError;

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } =
    await authClient.auth.getUser(token);
  if (userError || !userData.user || !isGlobalAdminUser(userData.user)) {
    return responseError(
      "Apenas um administrador global pode limpar órfãos.",
      403,
    );
  }

  try {
    const { data: rows, error: rowsError } = await serviceClient
      .from("campaign_email_samples")
      .select("storage_path,workspace_id,campaign_id");
    if (rowsError)
      return responseError("Não foi possível listar os metadados.", 503);
    const knownPaths = new Set((rows ?? []).map((row) => row.storage_path));
    const storagePaths = await listStoragePaths(serviceClient);
    const orphanedPaths = storagePaths.filter((path) => !knownPaths.has(path));
    let removed = 0;
    for (let index = 0; index < orphanedPaths.length; index += 100) {
      const batch = orphanedPaths.slice(index, index + 100);
      const { error } = await serviceClient.storage
        .from(bucketName)
        .remove(batch);
      if (error) throw error;
      removed += batch.length;
    }
    if (orphanedPaths.length) {
      await serviceClient.from("campaign_email_sample_logs").insert(
        orphanedPaths.map((path) => ({
          action: "orphan_cleanup",
          user_id: userData.user.id,
          details: { storagePath: path },
        })),
      );
    }
    return NextResponse.json({ scanned: storagePaths.length, removed });
  } catch (error) {
    return responseError(
      `A limpeza de arquivos órfãos falhou: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      502,
    );
  }
}
