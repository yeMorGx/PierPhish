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
  mode?: unknown;
  name?: unknown;
  email?: unknown;
  password?: unknown;
  workspaceId?: unknown;
  role?: unknown;
};

type UserActionPayload = {
  action?: unknown;
  userId?: unknown;
  password?: unknown;
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

function userDisplayName(user: User) {
  const metadata = user.user_metadata as
    | { display_name?: unknown; name?: unknown }
    | undefined;
  return typeof metadata?.display_name === "string"
    ? metadata.display_name
    : typeof metadata?.name === "string"
      ? metadata.name
      : "";
}

function roleLabel(role: WorkspaceRole) {
  return {
    owner: "Proprietário",
    admin: "Administrador",
    analyst: "Analista",
    viewer: "Visualizador",
  }[role];
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
  let ownerWorkspaceIds: string[] | null = null;
  if (!isGlobalAdmin) {
    const { data: managerMemberships, error: managerMembershipError } =
      await client
        .from("pierphish_workspace_members")
        .select("workspace_id,role")
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
    ownerWorkspaceIds = (managerMemberships ?? [])
      .filter((membership) => membership.role === "owner")
      .map((membership) => String(membership.workspace_id));
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

  return {
    client,
    error: null,
    managedWorkspaceIds,
    ownerWorkspaceIds,
    adminUser: data.user,
  };
}

async function canOwnerManageUser(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  requesterId: string,
  targetId: string,
  ownerWorkspaceIds: string[] | null,
) {
  if (requesterId === targetId) {
    return {
      allowed: false,
      error: responseError("Você não pode executar esta ação na própria conta.", 400),
    };
  }
  if (ownerWorkspaceIds === null) return { allowed: true, error: null };
  if (!ownerWorkspaceIds.length) {
    return {
      allowed: false,
      error: responseError(
        "Somente o proprietário do workspace pode executar esta ação.",
        403,
      ),
    };
  }

  const { data: memberships, error: membershipError } = await client
    .from("pierphish_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", targetId)
    .eq("status", "active")
    .in("workspace_id", ownerWorkspaceIds);
  if (membershipError) {
    return {
      allowed: false,
      error: responseError("Não foi possível verificar o usuário.", 503),
    };
  }

  if (!memberships?.length) {
    return {
      allowed: false,
      error: responseError(
        "Você só pode administrar usuários do seu workspace.",
        403,
      ),
    };
  }
  if (memberships.some((membership) => membership.role === "owner")) {
    return {
      allowed: false,
      error: responseError(
        "A conta de um proprietário não pode ser alterada por outro proprietário.",
        403,
      ),
    };
  }

  return { allowed: true, error: null };
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
  const displayName = userDisplayName(user);

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
  const { client, error, managedWorkspaceIds, adminUser } =
    await requireAdmin(request);
  if (error || !client) return error;

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return responseError("Envie os dados do usuário em JSON válido.", 400);
  }

  const mode = payload.mode === "invite" ? "invite" : "create";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  const role = typeof payload.role === "string" ? payload.role : "";

  if (mode === "create" && (name.length < 2 || name.length > 80)) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Informe um e-mail válido.", 400);
  }

  if (mode === "create") {
    const passwordError = validatePassword(password, email);
    if (passwordError) return responseError(passwordError, 400);
  }
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
    .select("id,name,environment")
    .eq("id", databaseWorkspaceId)
    .maybeSingle();
  if (workspaceError || !workspace) {
    return responseError("O workspace escolhido não existe mais.", 400);
  }

  if (mode === "invite") {
    const { data: existingUsers, error: existingUsersError } =
      await client.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (existingUsersError) {
      return responseError("Não foi possível localizar o usuário.", 502);
    }

    const invitedUser = (existingUsers.users ?? []).find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!invitedUser) {
      return responseError(
        "Não existe uma conta com este e-mail. Crie o usuário primeiro ou use outro e-mail.",
        404,
      );
    }

    const { data: previousMembership, error: previousMembershipError } =
      await client
        .from("pierphish_workspace_members")
        .select("id,role,status")
        .eq("workspace_id", workspace.id)
        .eq("user_id", invitedUser.id)
        .maybeSingle();
    if (previousMembershipError) {
      return responseError(
        "Não foi possível verificar o acesso existente.",
        502,
      );
    }
    if (previousMembership?.status === "active") {
      return responseError("Este usuário já faz parte deste workspace.", 409);
    }

    const { error: membershipError } = await client
      .from("pierphish_workspace_members")
      .upsert(
        {
          workspace_id: workspace.id,
          user_id: invitedUser.id,
          role,
          status: "active",
        },
        { onConflict: "workspace_id,user_id" },
      );
    if (membershipError) {
      return responseError(
        "Não foi possível liberar o acesso ao workspace.",
        400,
      );
    }

    const inviterName =
      userDisplayName(adminUser) || adminUser.email || "Um administrador";
    const { error: notificationError } = await client
      .from("pierphish_notifications")
      .insert({
        recipient_user_id: invitedUser.id,
        workspace_id: workspace.id,
        type: "workspace_invite",
        title: `Acesso liberado em ${workspace.name}`,
        message: `${inviterName} adicionou você a este workspace como ${roleLabel(role as WorkspaceRole)}.`,
        action_path: "/",
        metadata: {
          workspace_name: workspace.name,
          role,
          invited_by: adminUser.id,
        },
      });
    if (notificationError) {
      if (previousMembership) {
        await client
          .from("pierphish_workspace_members")
          .update({
            role: previousMembership.role,
            status: previousMembership.status,
          })
          .eq("id", previousMembership.id);
      } else {
        await client
          .from("pierphish_workspace_members")
          .delete()
          .eq("workspace_id", workspace.id)
          .eq("user_id", invitedUser.id);
      }
      return responseError(
        "O acesso não foi liberado porque o aviso não pôde ser criado.",
        502,
      );
    }

    return NextResponse.json(
      {
        invitation: {
          email,
          name: userDisplayName(invitedUser),
          workspaceName: workspace.name,
          role,
        },
      },
      { status: 201 },
    );
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

export async function PATCH(request: NextRequest) {
  const { client, error, ownerWorkspaceIds, adminUser } =
    await requireAdmin(request);
  if (error || !client) {
    return error ?? responseError("Não foi possível validar a sessão.", 401);
  }

  let payload: UserActionPayload;
  try {
    payload = (await request.json()) as UserActionPayload;
  } catch {
    return responseError("Envie os dados da ação em JSON válido.", 400);
  }

  if (payload.action !== "reset-password") {
    return responseError("Ação de usuário inválida.", 400);
  }

  const targetId = typeof payload.userId === "string" ? payload.userId : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!targetId) return responseError("Usuário não informado.", 400);

  const permission = await canOwnerManageUser(
    client,
    adminUser.id,
    targetId,
    ownerWorkspaceIds,
  );
  if (permission.error || !permission.allowed) {
    return (
      permission.error ??
      responseError("Você não tem permissão para executar esta ação.", 403)
    );
  }

  const { data: targetData, error: targetError } =
    await client.auth.admin.getUserById(targetId);
  if (targetError || !targetData.user) {
    return responseError("Usuário não encontrado.", 404);
  }
  const passwordError = validatePassword(
    password,
    targetData.user.email ?? "usuario",
  );
  if (passwordError) return responseError(passwordError, 400);

  const targetMetadata = (targetData.user.app_metadata ?? {}) as Record<
    string,
    unknown
  >;
  const { error: updateError } = await client.auth.admin.updateUserById(
    targetId,
    {
      password,
      app_metadata: {
        ...targetMetadata,
        password_rotation_required: true,
      },
    },
  );
  if (updateError) {
    return responseError("Não foi possível redefinir a senha.", 502);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { client, error, ownerWorkspaceIds, adminUser } =
    await requireAdmin(request);
  if (error || !client) {
    return error ?? responseError("Não foi possível validar a sessão.", 401);
  }

  let payload: UserActionPayload;
  try {
    payload = (await request.json()) as UserActionPayload;
  } catch {
    return responseError("Envie os dados da exclusão em JSON válido.", 400);
  }

  const targetId = typeof payload.userId === "string" ? payload.userId : "";
  if (!targetId) return responseError("Usuário não informado.", 400);

  const permission = await canOwnerManageUser(
    client,
    adminUser.id,
    targetId,
    ownerWorkspaceIds,
  );
  if (permission.error || !permission.allowed) {
    return (
      permission.error ??
      responseError("Você não tem permissão para executar esta ação.", 403)
    );
  }

  const { data: targetData, error: targetError } =
    await client.auth.admin.getUserById(targetId);
  if (targetError || !targetData.user) {
    return responseError("Usuário não encontrado.", 404);
  }

  const { error: deleteError } = await client.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return responseError("Não foi possível excluir o usuário.", 502);
  }

  return NextResponse.json({ ok: true, email: targetData.user.email ?? "" });
}
