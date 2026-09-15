import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";

type AdminMetadata = {
  role?: unknown;
  is_admin?: unknown;
};

type CreateUserPayload = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  workspaceId?: unknown;
  role?: unknown;
};

type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";

const workspaceRoles = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "analyst",
  "viewer",
]);

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(request: NextRequest) {
  const client = getAdminClient();
  if (!client) {
    return {
      client: null,
      error: responseError(
        "A administração de usuários ainda não foi configurada no servidor.",
        503,
      ),
    };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      client: null,
      error: responseError("Sessão não encontrada.", 401),
    };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return {
      client: null,
      error: responseError("Sua sessão não é válida.", 401),
    };
  }

  const metadata = (data.user.app_metadata ?? {}) as AdminMetadata;
  const role = typeof metadata.role === "string" ? metadata.role : "";
  const isGlobalAdmin =
    data.user.email?.toLowerCase() === superAdminEmail ||
    metadata.is_admin === true ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin";

  let managedWorkspaceIds: string[] | null = null;
  if (!isGlobalAdmin) {
    const { data: managerMemberships, error: managerMembershipError } =
      await client
        .from("pierphish_workspace_members")
        .select("workspace_id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"]);
    if (managerMembershipError) {
      return {
        client: null,
        error: responseError(
          "A estrutura de acessos ainda não foi aplicada ao Supabase.",
          503,
        ),
      };
    }
    managedWorkspaceIds = (managerMemberships ?? []).map((membership) =>
      String(membership.workspace_id),
    );
    if (managedWorkspaceIds.length === 0) {
      return {
        client: null,
        error: responseError(
          "Você não tem permissão para administrar usuários.",
          403,
        ),
      };
    }
  }

  return { client, error: null, managedWorkspaceIds };
}

function safeUser(
  user: User,
  workspaceMemberships: Array<{
    workspaceId: string;
    workspaceName: string;
    environment: "test" | "production";
    role: WorkspaceRole;
  }> = [],
) {
  const metadata = user.user_metadata as
    | { display_name?: unknown; name?: unknown }
    | undefined;
  const displayName =
    typeof metadata?.display_name === "string"
      ? metadata.display_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : "";

  return {
    id: user.id,
    email: user.email ?? "",
    name: displayName,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    emailConfirmed: Boolean(user.email_confirmed_at),
    passwordRotationRequired:
      (user.app_metadata as { password_rotation_required?: unknown } | null)
        ?.password_rotation_required === true,
    workspaceMemberships,
  };
}

function validatePassword(password: string, email: string) {
  if (password.length < 12) return "A senha inicial precisa ter 12 caracteres.";

  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (groups < 3) {
    return "Use pelo menos 3 grupos: maiúsculas, minúsculas, números ou símbolos.";
  }

  const normalizedPassword = password.toLowerCase();
  const normalizedEmail = email.toLowerCase().split("@")[0];
  const commonPasswords = ["password", "senha", "pierphish", "be phish"];
  if (
    commonPasswords.some((value) => normalizedPassword.includes(value)) ||
    (normalizedEmail.length >= 4 &&
      normalizedPassword.includes(normalizedEmail))
  ) {
    return "Evite senhas previsíveis ou relacionadas ao usuário e ao produto.";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { client, error, managedWorkspaceIds } = await requireAdmin(request);
  if (error || !client) return error;

  const { data, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listError)
    return responseError("Não foi possível carregar os usuários.", 502);

  let membershipQuery = client
    .from("pierphish_workspace_members")
    .select("user_id,workspace_id,role,status");
  if (managedWorkspaceIds) {
    membershipQuery = membershipQuery.in("workspace_id", managedWorkspaceIds);
  }
  const { data: membershipRows, error: membershipError } =
    await membershipQuery;
  if (membershipError) {
    return responseError(
      "A estrutura de acessos ainda não foi aplicada ao Supabase.",
      503,
    );
  }

  const { data: workspaceRows, error: workspaceError } = await client
    .from("pierphish_workspaces")
    .select("id,name,environment");
  if (workspaceError) {
    return responseError("Não foi possível carregar os workspaces.", 502);
  }

  const workspaceById = new Map(
    (workspaceRows ?? []).map((workspace) => [String(workspace.id), workspace]),
  );
  const membershipsByUser = new Map<
    string,
    Array<{
      workspaceId: string;
      workspaceName: string;
      environment: "test" | "production";
      role: WorkspaceRole;
    }>
  >();
  for (const membership of membershipRows ?? []) {
    if (membership.status !== "active") continue;
    const workspace = workspaceById.get(String(membership.workspace_id));
    if (!workspace) continue;
    const role = workspaceRoles.has(membership.role as WorkspaceRole)
      ? (membership.role as WorkspaceRole)
      : "viewer";
    const current = membershipsByUser.get(String(membership.user_id)) ?? [];
    current.push({
      workspaceId:
        String(membership.workspace_id) === persistedPrimaryWorkspaceId
          ? "primary"
          : String(membership.workspace_id),
      workspaceName: String(workspace.name ?? "Workspace sem nome"),
      environment:
        workspace.environment === "production" ? "production" : "test",
      role,
    });
    membershipsByUser.set(String(membership.user_id), current);
  }

  const visibleUserIds = managedWorkspaceIds
    ? new Set(
        (membershipRows ?? []).map((membership) => String(membership.user_id)),
      )
    : null;

  return NextResponse.json({
    users: data.users
      .filter((user) => !visibleUserIds || visibleUserIds.has(user.id))
      .map((user) => safeUser(user, membershipsByUser.get(user.id) ?? [])),
  });
}

export async function POST(request: NextRequest) {
  const { client, error, managedWorkspaceIds } = await requireAdmin(request);
  if (error || !client) return error;

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return responseError("Envie os dados do usuário em JSON válido.", 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  const role = typeof payload.role === "string" ? payload.role : "";

  if (name.length < 2 || name.length > 80) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Informe um e-mail válido.", 400);
  }

  const passwordError = validatePassword(password, email);
  if (passwordError) return responseError(passwordError, 400);
  if (!workspaceId) return responseError("Escolha um workspace.", 400);
  if (!workspaceRoles.has(role as WorkspaceRole)) {
    return responseError("Escolha um nível de acesso válido.", 400);
  }

  const databaseWorkspaceId =
    workspaceId === "primary" ? persistedPrimaryWorkspaceId : workspaceId;
  if (
    managedWorkspaceIds &&
    !managedWorkspaceIds.includes(databaseWorkspaceId)
  ) {
    return responseError(
      "Você só pode criar usuários em workspaces que administra.",
      403,
    );
  }
  if (managedWorkspaceIds && role === "owner") {
    return responseError(
      "Somente o super administrador pode conceder o nível Proprietário.",
      403,
    );
  }
  const { data: workspace, error: workspaceError } = await client
    .from("pierphish_workspaces")
    .select("id")
    .eq("id", databaseWorkspaceId)
    .maybeSingle();
  if (workspaceError || !workspace) {
    return responseError("O workspace escolhido não existe mais.", 400);
  }

  const { data, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
    app_metadata: {
      role: "member",
      password_rotation_required: true,
    },
  });

  if (createError || !data.user) {
    const message = createError?.message.toLowerCase().includes("already")
      ? "Já existe um usuário com este e-mail."
      : "Não foi possível criar o usuário.";
    return responseError(message, 400);
  }

  const { error: membershipError } = await client
    .from("pierphish_workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: data.user.id,
      role,
      status: "active",
    });
  if (membershipError) {
    await client.auth.admin.deleteUser(data.user.id);
    return responseError(
      "Não foi possível vincular o usuário ao workspace.",
      400,
    );
  }

  const workspaceMemberships: Array<{
    workspaceId: string;
    workspaceName: string;
    environment: "test" | "production";
    role: WorkspaceRole;
  }> = [
    {
      workspaceId,
      workspaceName: "",
      environment: "test",
      role: role as WorkspaceRole,
    },
  ];
  const { data: createdWorkspace } = await client
    .from("pierphish_workspaces")
    .select("name,environment")
    .eq("id", workspace.id)
    .maybeSingle();
  if (createdWorkspace) {
    workspaceMemberships[0].workspaceName = String(
      createdWorkspace.name ?? "Workspace sem nome",
    );
    workspaceMemberships[0].environment =
      createdWorkspace.environment === "production" ? "production" : "test";
  }

  return NextResponse.json(
    { user: safeUser(data.user, workspaceMemberships) },
    { status: 201 },
  );
}
