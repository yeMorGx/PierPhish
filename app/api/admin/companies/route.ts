import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const credentialKey = process.env.PIERPHISH_CREDENTIAL_KEY;
const superAdminEmail = "admin@teste.com";

type AdminMetadata = {
  role?: unknown;
  is_admin?: unknown;
};

type WorkspacePayload = {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  environment?: unknown;
  description?: unknown;
  logoUrl?: unknown;
  workspaceId?: unknown;
  clientId?: unknown;
  clientSecret?: unknown;
  status?: unknown;
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminClient(key: string | undefined, accessToken?: string) {
  if (!supabaseUrl || !key) return null;

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      client: null,
      error: responseError("Sessão não encontrada.", 401),
    };
  }

  const authClient = getAdminClient(publishableKey ?? serviceRoleKey, token);
  if (!authClient) {
    return {
      client: null,
      error: responseError(
        "O Supabase não foi configurado no servidor. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
        503,
      ),
    };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return {
      client: null,
      error: responseError("Sua sessão não é válida.", 401),
    };
  }

  const metadata = (data.user.app_metadata ?? {}) as AdminMetadata;
  const role = typeof metadata.role === "string" ? metadata.role : "";
  const isAdmin =
    data.user.email?.toLowerCase() === superAdminEmail ||
    metadata.is_admin === true ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin";

  if (!isAdmin) {
    return {
      client: null,
      error: responseError(
        "Você não tem permissão para administrar empresas.",
        403,
      ),
    };
  }

  const client = serviceRoleKey
    ? (getAdminClient(serviceRoleKey) ?? authClient)
    : authClient;

  return { client, error: null };
}

function isLocalImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value)
  );
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function encryptSecret(secret: string) {
  if (!credentialKey) return null;
  const key = createHash("sha256").update(credentialKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function safeWorkspace(row: Record<string, unknown>) {
  const databaseId = String(row.id);
  return {
    id: databaseId === persistedPrimaryWorkspaceId ? "primary" : databaseId,
    name: String(row.name ?? "Workspace sem nome"),
    environment: row.environment === "production" ? "production" : "test",
    description: String(row.description ?? ""),
    logoUrl: isLocalImage(row.logo_url) ? row.logo_url : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function safeCompany(row: Record<string, unknown>) {
  const last4 = String(row.client_secret_last4 ?? "");
  const databaseWorkspaceId = String(row.workspace_id);
  return {
    id: String(row.id),
    workspaceId:
      databaseWorkspaceId === persistedPrimaryWorkspaceId
        ? "primary"
        : databaseWorkspaceId,
    name: String(row.name ?? "Cliente sem nome"),
    description: String(row.description ?? ""),
    clientId: String(row.client_id ?? ""),
    clientSecretLast4: last4,
    hasClientSecret: Boolean(row.client_secret_ciphertext),
    logoUrl: isLocalImage(row.logo_url) ? row.logo_url : null,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: String(row.created_at ?? ""),
  };
}

export async function GET(request: NextRequest) {
  const { client, error } = await requireAdmin(request);
  if (error || !client) return error;

  const [workspaceResult, companyResult] = await Promise.all([
    client
      .from("pierphish_workspaces")
      .select("id,name,environment,description,logo_url,created_at")
      .order("created_at", { ascending: true }),
    client
      .from("pierphish_companies")
      .select(
        "id,workspace_id,name,description,client_id,client_secret_last4,client_secret_ciphertext,logo_url,status,created_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  if (workspaceResult.error || companyResult.error) {
    return responseError(
      "A estrutura de empresas ainda não foi aplicada ao Supabase. Execute a migração do projeto.",
      503,
    );
  }

  return NextResponse.json({
    workspaces: (workspaceResult.data ?? []).map((row) =>
      safeWorkspace(row as Record<string, unknown>),
    ),
    companies: (companyResult.data ?? []).map((row) =>
      safeCompany(row as Record<string, unknown>),
    ),
  });
}

export async function POST(request: NextRequest) {
  const { client, error } = await requireAdmin(request);
  if (error || !client) return error;

  let payload: WorkspacePayload;
  try {
    payload = (await request.json()) as WorkspacePayload;
  } catch {
    return responseError("Envie os dados em JSON válido.", 400);
  }

  const type = text(payload.type);
  const name = text(payload.name);
  const description = text(payload.description).slice(0, 240);
  const logoUrl = isLocalImage(payload.logoUrl) ? payload.logoUrl : null;

  if (name.length < 2 || name.length > 80) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }

  if (type === "workspace") {
    const environment =
      payload.environment === "production" ? "production" : "test";
    const { data, error: insertError } = await client
      .from("pierphish_workspaces")
      .insert({ name, environment, description, logo_url: logoUrl })
      .select("id,name,environment,description,logo_url,created_at")
      .single();

    if (insertError || !data)
      return responseError("Não foi possível criar o workspace.", 400);
    return NextResponse.json(
      { workspace: safeWorkspace(data as Record<string, unknown>) },
      { status: 201 },
    );
  }

  if (type !== "company") {
    return responseError(
      "Informe se deseja criar um workspace ou cliente.",
      400,
    );
  }

  const workspaceId = text(payload.workspaceId);
  const databaseWorkspaceId =
    workspaceId === "primary" ? persistedPrimaryWorkspaceId : workspaceId;
  const clientId = text(payload.clientId);
  const clientSecret = text(payload.clientSecret);
  if (!workspaceId) return responseError("Escolha um workspace.", 400);
  if (clientId.length < 2 || clientId.length > 180) {
    return responseError("Informe um Client ID válido.", 400);
  }
  if (clientSecret.length < 8 || clientSecret.length > 300) {
    return responseError("Informe um Client Secret válido.", 400);
  }

  const encryptedSecret = encryptSecret(clientSecret);
  if (!encryptedSecret) {
    return responseError(
      "Defina PIERPHISH_CREDENTIAL_KEY no servidor antes de salvar credenciais.",
      503,
    );
  }

  const { data, error: insertError } = await client
    .from("pierphish_companies")
    .insert({
      workspace_id: databaseWorkspaceId,
      name,
      description,
      client_id: clientId,
      client_secret_ciphertext: encryptedSecret,
      client_secret_last4: clientSecret.slice(-4),
      logo_url: logoUrl,
      status: "active",
    })
    .select(
      "id,workspace_id,name,description,client_id,client_secret_last4,client_secret_ciphertext,logo_url,status,created_at",
    )
    .single();

  if (insertError || !data)
    return responseError("Não foi possível criar o cliente.", 400);
  return NextResponse.json(
    { company: safeCompany(data as Record<string, unknown>) },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const { client, error } = await requireAdmin(request);
  if (error || !client) return error;

  let payload: WorkspacePayload;
  try {
    payload = (await request.json()) as WorkspacePayload;
  } catch {
    return responseError("Envie os dados em JSON válido.", 400);
  }

  const id = text(payload.id);
  const name = text(payload.name);
  const type = text(payload.type);
  if (!id) {
    return responseError(
      type === "workspace" ? "Workspace não informado." : "Cliente não informado.",
      400,
    );
  }
  if (name.length < 2 || name.length > 80) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }

  if (type === "workspace") {
    const databaseId = id === "primary" ? persistedPrimaryWorkspaceId : id;
    const environment =
      payload.environment === "production" ? "production" : "test";
    const logoUrl = isLocalImage(payload.logoUrl) ? payload.logoUrl : null;
    const { data, error: updateError } = await client
      .from("pierphish_workspaces")
      .update({
        name,
        environment,
        description: text(payload.description).slice(0, 240),
        logo_url: payload.logoUrl === null ? null : logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", databaseId)
      .select("id,name,environment,description,logo_url,created_at")
      .single();

    if (updateError || !data) {
      return responseError("Não foi possível atualizar o workspace.", 400);
    }
    return NextResponse.json({
      workspace: safeWorkspace(data as Record<string, unknown>),
    });
  }

  const update: Record<string, unknown> = {
    name,
    description: text(payload.description).slice(0, 240),
    client_id: text(payload.clientId),
    updated_at: new Date().toISOString(),
  };
  if (payload.logoUrl === null) update.logo_url = null;
  else if (isLocalImage(payload.logoUrl)) update.logo_url = payload.logoUrl;
  if (payload.status === "inactive" || payload.status === "active")
    update.status = payload.status;

  const clientSecret = text(payload.clientSecret);
  if (clientSecret) {
    if (clientSecret.length < 8 || clientSecret.length > 300) {
      return responseError("Informe um Client Secret válido.", 400);
    }
    const encryptedSecret = encryptSecret(clientSecret);
    if (!encryptedSecret) {
      return responseError(
        "Defina PIERPHISH_CREDENTIAL_KEY no servidor antes de salvar credenciais.",
        503,
      );
    }
    update.client_secret_ciphertext = encryptedSecret;
    update.client_secret_last4 = clientSecret.slice(-4);
  }

  const { data, error: updateError } = await client
    .from("pierphish_companies")
    .update(update)
    .eq("id", id)
    .select(
      "id,workspace_id,name,description,client_id,client_secret_last4,client_secret_ciphertext,logo_url,status,created_at",
    )
    .single();

  if (updateError || !data)
    return responseError("Não foi possível atualizar o cliente.", 400);
  return NextResponse.json({
    company: safeCompany(data as Record<string, unknown>),
  });
}
