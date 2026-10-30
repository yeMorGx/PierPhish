import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { findAuthUserByEmail, listAllAuthUsers } from "@/lib/admin-auth-users";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
import { identifyAikidoUser, requireMfa } from "@/lib/server-auth";
import { recalculateWorkspaceCampaignStats } from "@/lib/server-statistics";
import {
  getAppBaseUrl,
  isResendConfigured,
  makeAccountInviteEmail,
  makePasswordResetEmail,
  makeWorkspaceInviteEmail,
  sendPierSecEmail,
} from "@/lib/server-email";
import { recordAuditEvent } from "@/lib/server-audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";

type AdminMetadata = {
  role?: unknown;
  is_admin?: unknown;
};

type CreateUserPayload = {
  delivery?: unknown;
  mode?: unknown;
  name?: unknown;
  email?: unknown;
  workspaceId?: unknown;
  role?: unknown;
  excludeFromStatistics?: unknown;
};

type UserActionPayload = {
  delivery?: unknown;
  action?: unknown;
  userId?: unknown;
  workspaceId?: unknown;
  role?: unknown;
  excludeFromStatistics?: unknown;
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
    { display_name?: unknown; name?: unknown } | undefined;
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

function isGlobalAdminAccount(user: User) {
  const metadata = (user.app_metadata ?? {}) as AdminMetadata;
  const role = typeof metadata.role === "string" ? metadata.role : "";
  return (
    user.email?.toLowerCase() === superAdminEmail ||
    metadata.is_admin === true ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin"
  );
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

  const mfaError = await requireMfa(client, token);
  if (mfaError) {
    return { client: null, error: mfaError };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return {
      client: null,
      error: responseError("Sua sessão não é válida.", 401),
    };
  }
  identifyAikidoUser(data.user);

  const isGlobalAdmin = isGlobalAdminAccount(data.user);

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

async function canManagerManageUser(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  requesterId: string,
  targetId: string,
  managedWorkspaceIds: string[] | null,
  ownerWorkspaceIds: string[] | null,
) {
  if (requesterId === targetId) {
    return {
      allowed: false,
      error: responseError(
        "Você não pode executar esta ação na própria conta.",
        400,
      ),
    };
  }
  if (ownerWorkspaceIds === null) return { allowed: true, error: null };
  if (!managedWorkspaceIds?.length) {
    return {
      allowed: false,
      error: responseError(
        "Você não administra workspaces com acesso a este usuário.",
        403,
      ),
    };
  }

  const { data: memberships, error: membershipError } = await client
    .from("pierphish_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", targetId)
    .eq("status", "active");
  if (membershipError) {
    return {
      allowed: false,
      error: responseError("Não foi possível verificar o usuário.", 503),
    };
  }

  const targetMemberships = memberships ?? [];
  if (
    !targetMemberships.some((membership) =>
      managedWorkspaceIds.includes(membership.workspace_id),
    )
  ) {
    return {
      allowed: false,
      error: responseError(
        "Você só pode administrar usuários dos workspaces que administra.",
        403,
      ),
    };
  }
  if (
    targetMemberships.some(
      (membership) => !managedWorkspaceIds.includes(membership.workspace_id),
    )
  ) {
    return {
      allowed: false,
      error: responseError(
        "Este usuário também pertence a um workspace que você não administra.",
        403,
      ),
    };
  }
  if (targetMemberships.some((membership) => membership.role === "owner")) {
    return {
      allowed: false,
      error: responseError(
        "A conta de um proprietário não pode ser alterada por outro administrador.",
        403,
      ),
    };
  }
  if (
    ownerWorkspaceIds.length > 0 &&
    !targetMemberships.some((membership) =>
      ownerWorkspaceIds.includes(membership.workspace_id),
    )
  ) {
    return {
      allowed: false,
      error: responseError(
        "Você só pode administrar usuários de workspaces dos quais é proprietário.",
        403,
      ),
    };
  }

  return { allowed: true, error: null };
}

async function canManageWorkspaceMembership(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  requesterId: string,
  targetId: string,
  workspaceId: string,
  requestedRole: WorkspaceRole,
  ownerWorkspaceIds: string[] | null,
) {
  if (requesterId === targetId) {
    return {
      allowed: false,
      error: responseError(
        "Você não pode alterar o próprio acesso por esta tela.",
        400,
      ),
    };
  }

  // A global administrator can manage every workspace membership.
  if (ownerWorkspaceIds === null) return { allowed: true, error: null };

  if (!ownerWorkspaceIds.includes(workspaceId)) {
    return {
      allowed: false,
      error: responseError(
        "Somente o proprietário do workspace pode editar este acesso.",
        403,
      ),
    };
  }

  if (requestedRole === "owner") {
    return {
      allowed: false,
      error: responseError(
        "Somente o super administrador pode conceder o nível Proprietário.",
        403,
      ),
    };
  }

  const { data: membership, error: membershipError } = await client
    .from("pierphish_workspace_members")
    .select("role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetId)
    .maybeSingle();
  if (membershipError) {
    return {
      allowed: false,
      error: responseError("Não foi possível verificar o usuário.", 503),
    };
  }
  if (!membership || membership.status !== "active") {
    return {
      allowed: false,
      error: responseError(
        "Esta pessoa não possui um acesso ativo neste workspace.",
        404,
      ),
    };
  }
  if (membership.role === "owner") {
    return {
      allowed: false,
      error: responseError(
        "O acesso de um proprietário não pode ser alterado por outro proprietário.",
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
    excludeFromStatistics: boolean;
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
    isGlobalAdmin: isGlobalAdminAccount(user),
    passwordRotationRequired:
      (user.app_metadata as { password_rotation_required?: unknown } | null)
        ?.password_rotation_required === true,
    workspaceMemberships,
  };
}

export async function GET(request: NextRequest) {
  const { client, error, managedWorkspaceIds } = await requireAdmin(request);
  if (error || !client) return error;

  const { users, error: listError } = await listAllAuthUsers((options) =>
    client.auth.admin.listUsers(options),
  );
  if (listError)
    return responseError("Não foi possível carregar os usuários.", 502);

  let membershipQuery = client
    .from("pierphish_workspace_members")
    .select("user_id,workspace_id,role,status,exclude_from_statistics");
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
      excludeFromStatistics: boolean;
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
      excludeFromStatistics: Boolean(membership.exclude_from_statistics),
    });
    membershipsByUser.set(String(membership.user_id), current);
  }

  const visibleUserIds = managedWorkspaceIds
    ? new Set(
        (membershipRows ?? []).map((membership) => String(membership.user_id)),
      )
    : null;

  return NextResponse.json({
    users: users
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
  const manualDelivery = mode === "create" && payload.delivery === "link";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  const role = typeof payload.role === "string" ? payload.role : "";
  const excludeFromStatistics = payload.excludeFromStatistics === true;

  if (mode === "create" && (name.length < 2 || name.length > 80)) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Informe um e-mail válido.", 400);
  }

  const appBaseUrl = getAppBaseUrl(request.nextUrl.origin);
  if ((!manualDelivery && !isResendConfigured()) || !appBaseUrl) {
    return responseError(
      "O envio de e-mails ainda não está configurado no servidor.",
      503,
    );
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
    const { user: invitedUser, error: existingUsersError } =
      await findAuthUserByEmail(
        (options) => client.auth.admin.listUsers(options),
        email,
      );
    if (existingUsersError) {
      return responseError("Não foi possível localizar o usuário.", 502);
    }

    if (!invitedUser) {
      return responseError(
        "Não existe uma conta com este e-mail. Crie o usuário primeiro ou use outro e-mail.",
        404,
      );
    }

    const { data: previousMembership, error: previousMembershipError } =
      await client
        .from("pierphish_workspace_members")
        .select("id,role,status,exclude_from_statistics")
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
          exclude_from_statistics: excludeFromStatistics,
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
            exclude_from_statistics: previousMembership.exclude_from_statistics,
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

    let statsUpdated = true;
    try {
      await recalculateWorkspaceCampaignStats(client, workspace.id);
    } catch {
      statsUpdated = false;
    }

    const emailResult = await sendPierSecEmail(
      makeWorkspaceInviteEmail({
        to: invitedUser.email ?? email,
        name: userDisplayName(invitedUser),
        workspaceName: workspace.name,
        role: roleLabel(role as WorkspaceRole),
        inviterName,
        actionUrl: `${appBaseUrl}/login`,
      }),
    );

    await recordAuditEvent(client, {
      workspaceId: workspace.id,
      actorUserId: adminUser.id,
      actorName: userDisplayName(adminUser) || adminUser.email,
      action: "workspace.member_added",
      resourceType: "user",
      resourceId: invitedUser.id,
      resourceName: userDisplayName(invitedUser) || "Acesso ao workspace",
      outcome: emailResult.sent ? "success" : "partial",
      metadata: { role_after: role, email_sent: emailResult.sent },
    });

    return NextResponse.json(
      {
        invitation: {
          email,
          name: userDisplayName(invitedUser),
          workspaceName: workspace.name,
          role,
          emailSent: emailResult.sent,
          statsUpdated,
        },
      },
      { status: 201 },
    );
  }

  const existingAccount = await findAuthUserByEmail(
    (options) => client.auth.admin.listUsers(options),
    email,
  );
  if (existingAccount.error) {
    return responseError("Não foi possível verificar a conta existente.", 503);
  }
  if (existingAccount.user) {
    return responseError(
      "Já existe uma conta com este e-mail. Use as ações da lista ou vincule a conta existente.",
      409,
    );
  }

  const { data: inviteData, error: createError } =
    await client.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${appBaseUrl}/alterar-senha`,
        data: { display_name: name },
      },
    });

  if (createError || !inviteData.user || !inviteData.properties?.action_link) {
    const message = createError?.message.toLowerCase().includes("already")
      ? "Já existe um usuário com este e-mail."
      : "Não foi possível criar o usuário.";
    return responseError(message, 400);
  }

  const { data: updatedUserData, error: metadataError } =
    await client.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: {
        ...(inviteData.user.app_metadata as Record<string, unknown>),
        role: "member",
        password_rotation_required: true,
      },
    });
  if (metadataError || !updatedUserData.user) {
    await client.auth.admin.deleteUser(inviteData.user.id);
    return responseError("Não foi possível preparar o convite.", 502);
  }

  const { error: membershipError } = await client
    .from("pierphish_workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: updatedUserData.user.id,
      role,
      status: "active",
      exclude_from_statistics: excludeFromStatistics,
    });
  if (membershipError) {
    await client.auth.admin.deleteUser(updatedUserData.user.id);
    return responseError(
      "Não foi possível vincular o usuário ao workspace.",
      400,
    );
  }

  const emailResult = manualDelivery
    ? { sent: true }
    : await sendPierSecEmail(
        makeAccountInviteEmail({
          to: email,
          name,
          actionUrl: inviteData.properties.action_link,
        }),
      );
  if (!emailResult.sent) {
    await client
      .from("pierphish_workspace_members")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", updatedUserData.user.id);
    await client.auth.admin.deleteUser(updatedUserData.user.id);
    await recordAuditEvent(client, {
      workspaceId: workspace.id,
      actorUserId: adminUser.id,
      actorName: userDisplayName(adminUser) || adminUser.email,
      action: "user.invite_failed",
      resourceType: "user",
      resourceId: updatedUserData.user.id,
      resourceName: name,
      outcome: "failure",
      metadata: { email_sent: false, role_after: role },
    });
    return responseError(
      "Não foi possível enviar o convite. A conta não foi criada; confira a configuração de e-mail e tente novamente.",
      502,
    );
  }

  const workspaceMemberships: Array<{
    workspaceId: string;
    workspaceName: string;
    environment: "test" | "production";
    role: WorkspaceRole;
    excludeFromStatistics: boolean;
  }> = [
    {
      workspaceId,
      workspaceName: "",
      environment: "test",
      role: role as WorkspaceRole,
      excludeFromStatistics,
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

  await recordAuditEvent(client, {
    workspaceId: workspace.id,
    actorUserId: adminUser.id,
    actorName: userDisplayName(adminUser) || adminUser.email,
    action: "user.invited",
    resourceType: "user",
    resourceId: updatedUserData.user.id,
    resourceName: name,
    outcome: "success",
    metadata: {
      role_after: role,
      email_sent: !manualDelivery,
      delivery: manualDelivery ? "link" : "email",
    },
  });

  return NextResponse.json(
    {
      user: safeUser(updatedUserData.user, workspaceMemberships),
      ...(manualDelivery
        ? { inviteLink: inviteData.properties.action_link }
        : {}),
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest) {
  const { client, error, managedWorkspaceIds, ownerWorkspaceIds, adminUser } =
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

  if (payload.action === "update-membership") {
    const targetId = typeof payload.userId === "string" ? payload.userId : "";
    const rawWorkspaceId =
      typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (!targetId) return responseError("Usuário não informado.", 400);
    if (!rawWorkspaceId) return responseError("Workspace não informado.", 400);
    if (!workspaceRoles.has(role as WorkspaceRole)) {
      return responseError("Escolha um nível de acesso válido.", 400);
    }

    const workspaceId =
      rawWorkspaceId === "primary"
        ? persistedPrimaryWorkspaceId
        : rawWorkspaceId;
    const permission = await canManageWorkspaceMembership(
      client,
      adminUser.id,
      targetId,
      workspaceId,
      role as WorkspaceRole,
      ownerWorkspaceIds,
    );
    if (permission.error || !permission.allowed) {
      return (
        permission.error ??
        responseError("Você não tem permissão para editar este acesso.", 403)
      );
    }

    const { data: membership, error: membershipError } = await client
      .from("pierphish_workspace_members")
      .select("id,workspace_id,user_id,role,status,exclude_from_statistics")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetId)
      .maybeSingle();
    if (membershipError) {
      return responseError(
        "Não foi possível carregar o acesso do usuário.",
        503,
      );
    }
    if (!membership || membership.status !== "active") {
      return responseError(
        "Acesso do usuário não encontrado neste workspace.",
        404,
      );
    }

    const excludeFromStatistics =
      typeof payload.excludeFromStatistics === "boolean"
        ? payload.excludeFromStatistics
        : Boolean(membership.exclude_from_statistics);
    const { error: updateError } = await client
      .from("pierphish_workspace_members")
      .update({
        role,
        exclude_from_statistics: excludeFromStatistics,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership.id);
    if (updateError) {
      return responseError("Não foi possível salvar o acesso do usuário.", 502);
    }

    const previousExcluded = Boolean(membership.exclude_from_statistics);
    if (
      membership.role !== role ||
      previousExcluded !== excludeFromStatistics
    ) {
      const { data: targetUser } =
        await client.auth.admin.getUserById(targetId);
      await recordAuditEvent(client, {
        workspaceId,
        actorUserId: adminUser.id,
        actorName: userDisplayName(adminUser) || adminUser.email,
        action: "workspace.member_updated",
        resourceType: "user",
        resourceId: targetId,
        resourceName: targetUser?.user
          ? userDisplayName(targetUser.user) || "Acesso ao workspace"
          : "Acesso ao workspace",
        outcome: "success",
        metadata: {
          role_before: membership.role,
          role_after: role,
          excluded_before: previousExcluded,
          excluded_after: excludeFromStatistics,
        },
      });
    }

    try {
      await recalculateWorkspaceCampaignStats(client, workspaceId);
    } catch {
      return responseError(
        "O acesso foi salvo, mas não foi possível atualizar os indicadores deste workspace.",
        502,
      );
    }

    return NextResponse.json({
      membership: {
        workspaceId: rawWorkspaceId,
        userId: targetId,
        role,
        excludeFromStatistics,
      },
    });
  }

  const resendInvite = payload.action === "resend-invite";
  const manualDelivery = resendInvite && payload.delivery === "link";
  if (payload.action !== "reset-password" && !resendInvite) {
    return responseError("Ação de usuário inválida.", 400);
  }

  const targetId = typeof payload.userId === "string" ? payload.userId : "";
  if (!targetId) return responseError("Usuário não informado.", 400);

  const permission = await canManagerManageUser(
    client,
    adminUser.id,
    targetId,
    managedWorkspaceIds,
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
  if (ownerWorkspaceIds !== null && isGlobalAdminAccount(targetData.user)) {
    return responseError(
      "Somente um administrador global pode alterar esta conta.",
      403,
    );
  }
  const targetEmail = targetData.user.email;
  const emailConfirmed = Boolean(targetData.user.email_confirmed_at);
  if (resendInvite && emailConfirmed) {
    return responseError(
      "Este usuário já confirmou o e-mail. Use a redefinição de senha.",
      409,
    );
  }
  const { data: targetMemberships, error: targetMembershipError } = await client
    .from("pierphish_workspace_members")
    .select("workspace_id")
    .eq("user_id", targetId)
    .eq("status", "active");
  if (targetMembershipError) {
    return responseError(
      "Não foi possível verificar os workspaces do usuário.",
      503,
    );
  }
  const auditWorkspaceIds = Array.from(
    new Set(
      (targetMemberships ?? []).map((membership) => membership.workspace_id),
    ),
  ).filter(
    (workspaceId) =>
      managedWorkspaceIds === null || managedWorkspaceIds.includes(workspaceId),
  );
  const recordAccessEmail = async (sent: boolean) => {
    const action = resendInvite
      ? sent
        ? "user.invite_resent"
        : "user.invite_resend_failed"
      : sent
        ? "user.password_reset_sent"
        : "user.password_reset_failed";
    for (const workspaceId of auditWorkspaceIds.length
      ? auditWorkspaceIds
      : [null]) {
      await recordAuditEvent(client, {
        workspaceId,
        actorUserId: adminUser.id,
        actorName: userDisplayName(adminUser) || adminUser.email,
        action,
        resourceType: "user",
        resourceId: targetId,
        resourceName: userDisplayName(targetData.user) || "Acesso da pessoa",
        outcome: sent ? "success" : "failure",
        metadata: { email_sent: sent },
      });
    }
  };
  const appBaseUrl = getAppBaseUrl(request.nextUrl.origin);
  if (
    !targetEmail ||
    (!manualDelivery && !isResendConfigured()) ||
    !appBaseUrl
  ) {
    await recordAccessEmail(false);
    return responseError(
      "O envio de e-mails ainda não está configurado no servidor.",
      503,
    );
  }

  const { data: linkData, error: linkError } =
    await client.auth.admin.generateLink({
      type: emailConfirmed ? "recovery" : "invite",
      email: targetEmail,
      options: {
        redirectTo: `${appBaseUrl}${emailConfirmed ? "/redefinir-senha" : "/alterar-senha"}`,
      },
    });
  if (linkError || !linkData.user || !linkData.properties?.action_link) {
    await recordAccessEmail(false);
    return responseError("Não foi possível gerar o link de acesso.", 502);
  }

  if (!emailConfirmed) {
    const targetMetadata = (targetData.user.app_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const { error: metadataError } = await client.auth.admin.updateUserById(
      targetId,
      {
        app_metadata: {
          ...targetMetadata,
          password_rotation_required: true,
        },
      },
    );
    if (metadataError) {
      await recordAccessEmail(false);
      return responseError(
        "Não foi possível preparar o convite de acesso.",
        502,
      );
    }
  }

  if (manualDelivery) {
    for (const workspaceId of auditWorkspaceIds) {
      await recordAuditEvent(client, {
        workspaceId,
        actorUserId: adminUser.id,
        actorName: userDisplayName(adminUser) || adminUser.email,
        action: "user.invited",
        resourceType: "user",
        resourceId: targetId,
        resourceName: userDisplayName(targetData.user),
        outcome: "success",
        metadata: { delivery: "link", email_sent: false },
      });
    }
    return NextResponse.json(
      { ok: true, inviteLink: linkData.properties.action_link },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const emailResult = await sendPierSecEmail(
    emailConfirmed
      ? makePasswordResetEmail({
          to: targetEmail,
          name: userDisplayName(targetData.user),
          actionUrl: linkData.properties.action_link,
        })
      : makeAccountInviteEmail({
          to: targetEmail,
          name: userDisplayName(targetData.user),
          actionUrl: linkData.properties.action_link,
        }),
  );
  await recordAccessEmail(emailResult.sent);
  if (!emailResult.sent) {
    return responseError("Não foi possível enviar o e-mail de acesso.", 502);
  }

  return NextResponse.json({ ok: true, emailSent: true });
}

export async function DELETE(request: NextRequest) {
  const { client, error, managedWorkspaceIds, ownerWorkspaceIds, adminUser } =
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

  const permission = await canManagerManageUser(
    client,
    adminUser.id,
    targetId,
    managedWorkspaceIds,
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
  if (ownerWorkspaceIds !== null && isGlobalAdminAccount(targetData.user)) {
    return responseError(
      "Somente um administrador global pode excluir esta conta.",
      403,
    );
  }

  const { data: targetMemberships } = await client
    .from("pierphish_workspace_members")
    .select("workspace_id")
    .eq("user_id", targetId);

  const { error: deleteError } = await client.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return responseError("Não foi possível excluir o usuário.", 502);
  }

  const affectedWorkspaces = Array.from(
    new Set((targetMemberships ?? []).map((item) => item.workspace_id)),
  );
  for (const workspaceId of affectedWorkspaces.length
    ? affectedWorkspaces
    : [null]) {
    await recordAuditEvent(client, {
      workspaceId,
      actorUserId: adminUser.id,
      actorName: userDisplayName(adminUser) || adminUser.email,
      action: "user.deleted",
      resourceType: "user",
      resourceId: targetId,
      resourceName: userDisplayName(targetData.user) || "Acesso removido",
      outcome: "success",
      idempotencyKey: `user-delete:${targetId}:${workspaceId ?? "global"}`,
    });
  }

  return NextResponse.json({ ok: true, email: targetData.user.email ?? "" });
}
