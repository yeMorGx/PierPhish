"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import {
  readActiveWorkspaceId,
  readLocalWorkspaces,
  type WorkspaceEnvironment,
  type WorkspaceRole,
} from "@/lib/company-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";

type WorkspaceMembership = {
  workspaceId: string;
  workspaceName: string;
  environment: WorkspaceEnvironment;
  role: WorkspaceRole;
  excludeFromStatistics: boolean;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  passwordRotationRequired: boolean;
  workspaceMemberships: WorkspaceMembership[];
};

type WorkspaceOption = {
  id: string;
  name: string;
  environment: WorkspaceEnvironment;
  role?: WorkspaceRole;
};

const managedUserColumn = createColumnHelper<ManagedUser>();
const managedUserColumns = [
  managedUserColumn.accessor("name", { header: "Pessoa" }),
  managedUserColumn.accessor("email", { header: "E-mail" }),
  managedUserColumn.accessor("createdAt", { header: "Criado em" }),
  managedUserColumn.accessor("lastSignInAt", { header: "Último acesso" }),
];

const roleOptions: Array<{
  value: WorkspaceRole;
  label: string;
  description: string;
}> = [
  {
    value: "owner",
    label: "Proprietário",
    description: "Controle completo do workspace",
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Gerencia operação e acessos",
  },
  {
    value: "analyst",
    label: "Analista",
    description: "Investiga campanhas e riscos",
  },
  {
    value: "viewer",
    label: "Visualizador",
    description: "Consulta dados sem editar",
  },
];

function roleLabel(role: WorkspaceRole) {
  return (
    roleOptions.find((option) => option.value === role)?.label ?? "Visualizador"
  );
}

const demoStorageKey = "pierphish-admin-users";
const superAdminEmail = "admin@teste.com";

const demoUsers: ManagedUser[] = [
  {
    id: "demo-admin",
    name: "Admin PierPhish",
    email: "admin@teste.com",
    createdAt: "2026-09-03T18:40:00.000Z",
    lastSignInAt: "2026-09-11T12:15:00.000Z",
    emailConfirmed: true,
    passwordRotationRequired: false,
    workspaceMemberships: [
      {
        workspaceId: "primary",
        workspaceName: "Workspace principal",
        environment: "production",
        role: "owner",
        excludeFromStatistics: false,
      },
    ],
  },
  {
    id: "demo-ana",
    name: "Ana Martins",
    email: "ana.martins@teste.com",
    createdAt: "2026-09-08T14:25:00.000Z",
    lastSignInAt: "2026-09-11T10:42:00.000Z",
    emailConfirmed: true,
    passwordRotationRequired: false,
    workspaceMemberships: [
      {
        workspaceId: "primary",
        workspaceName: "Workspace principal",
        environment: "production",
        role: "analyst",
        excludeFromStatistics: false,
      },
    ],
  },
  {
    id: "demo-rafael",
    name: "Rafael Costa",
    email: "rafael.costa@teste.com",
    createdAt: "2026-09-10T09:10:00.000Z",
    lastSignInAt: null,
    emailConfirmed: true,
    passwordRotationRequired: true,
    workspaceMemberships: [
      {
        workspaceId: "primary",
        workspaceName: "Workspace principal",
        environment: "production",
        role: "viewer",
        excludeFromStatistics: false,
      },
    ],
  },
];

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "U";
  const initials = source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "U";
}

function formatDate(value: string | null) {
  if (!value) return "Ainda não acessou";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isGlobalAdminUser(user: ReturnType<typeof useAuth>["user"]) {
  if (!isSupabaseConfigured) return true;
  if (user?.email?.toLowerCase() === superAdminEmail) return true;
  const metadata = user?.app_metadata as
    { role?: unknown; is_admin?: unknown } | undefined;
  return (
    metadata?.is_admin === true ||
    metadata?.role === "admin" ||
    metadata?.role === "owner" ||
    metadata?.role === "super_admin"
  );
}

export function UserManagementContent() {
  const { ready, user } = useAuth();
  const searchParams = useSearchParams();
  const requestedWorkspaceId = searchParams.get("workspace") ?? "";
  const [users, setUsers] = useState<ManagedUser[]>(demoUsers);
  const usersTable = useReactTable({
    data: users,
    columns: managedUserColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  const [loadingUsers, setLoadingUsers] = useState(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(
    [],
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("viewer");
  const [selectedExcludeFromStatistics, setSelectedExcludeFromStatistics] =
    useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("viewer");
  const [inviteExcludeFromStatistics, setInviteExcludeFromStatistics] =
    useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] =
    useState(isSupabaseConfigured);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const globalAdminAccess = isGlobalAdminUser(user);
  const adminAccess =
    !isSupabaseConfigured ||
    globalAdminAccess ||
    workspaceOptions.some(
      (workspace) => workspace.role === "owner" || workspace.role === "admin",
    );
  const ownerAccess =
    !isSupabaseConfigured ||
    globalAdminAccess ||
    workspaceOptions.some((workspace) => workspace.role === "owner");
  const availableRoleOptions = globalAdminAccess
    ? roleOptions
    : roleOptions.filter((option) => option.value !== "owner");
  const activeUsers = useMemo(
    () => users.filter((managedUser) => managedUser.emailConfirmed).length,
    [users],
  );
  const pendingPasswordChanges = useMemo(
    () =>
      users.filter((managedUser) => managedUser.passwordRotationRequired)
        .length,
    [users],
  );

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const localWorkspaces = readLocalWorkspaces().map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      environment: workspace.environment,
    }));
    setWorkspaceOptions(localWorkspaces);
    setSelectedWorkspaceId((current) => {
      if (
        requestedWorkspaceId &&
        localWorkspaces.some(
          (workspace) => workspace.id === requestedWorkspaceId,
        )
      ) {
        return requestedWorkspaceId;
      }
      if (localWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return localWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (localWorkspaces[0]?.id ?? "");
    });
    setInviteWorkspaceId((current) => {
      if (
        requestedWorkspaceId &&
        localWorkspaces.some(
          (workspace) => workspace.id === requestedWorkspaceId,
        )
      ) {
        return requestedWorkspaceId;
      }
      if (localWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return localWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (localWorkspaces[0]?.id ?? "");
    });
    const stored = window.localStorage.getItem(demoStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ManagedUser[];
      if (Array.isArray(parsed)) {
        setUsers(
          parsed.map((managedUser) => ({
            ...managedUser,
            workspaceMemberships: Array.isArray(
              managedUser.workspaceMemberships,
            )
              ? managedUser.workspaceMemberships
              : [],
          })),
        );
      }
    } catch {
      window.localStorage.removeItem(demoStorageKey);
    }
  }, [requestedWorkspaceId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !ready) return;
    void loadWorkspaces();
    // A atualização só precisa acontecer quando a sessão estiver pronta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!isSupabaseConfigured || !adminAccess || !ready) return;
    void loadUsers();
    // A atualização só precisa acontecer quando a sessão e o workspace estiverem prontos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAccess, ready]);

  async function getAccessToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError(
        "Sua sessão expirou. Entre novamente para administrar usuários.",
      );
      setLoadingUsers(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      users?: ManagedUser[];
      error?: string;
    };
    if (!response.ok)
      setError(body.error ?? "Não foi possível carregar os usuários.");
    else setUsers(body.users ?? []);
    setLoadingUsers(false);
  }

  async function loadWorkspaces() {
    setLoadingWorkspaces(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setLoadingWorkspaces(false);
      return;
    }

    const response = await fetch("/api/workspaces", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      workspaces?: WorkspaceOption[];
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Não foi possível carregar os workspaces.");
      setLoadingWorkspaces(false);
      return;
    }

    const nextWorkspaces = body.workspaces ?? [];
    setWorkspaceOptions(nextWorkspaces);
    setSelectedWorkspaceId((current) => {
      if (
        requestedWorkspaceId &&
        nextWorkspaces.some(
          (workspace) => workspace.id === requestedWorkspaceId,
        )
      ) {
        return requestedWorkspaceId;
      }
      if (nextWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return nextWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (nextWorkspaces[0]?.id ?? "");
    });
    setInviteWorkspaceId((current) => {
      if (
        requestedWorkspaceId &&
        nextWorkspaces.some(
          (workspace) => workspace.id === requestedWorkspaceId,
        )
      ) {
        return requestedWorkspaceId;
      }
      if (nextWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return nextWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (nextWorkspaces[0]?.id ?? "");
    });
    setLoadingWorkspaces(false);
  }

  useEffect(() => {
    if (!requestedWorkspaceId || window.location.hash !== "#convites") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("workspace-invite")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedWorkspaceId, loadingWorkspaces]);

  function persistDemoUsers(nextUsers: ManagedUser[]) {
    setUsers(nextUsers);
    try {
      window.localStorage.setItem(demoStorageKey, JSON.stringify(nextUsers));
    } catch {
      // A demonstração continua utilizável mesmo se o storage estiver cheio.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (!name.trim() || !email.trim()) {
      setError("Preencha o nome e o e-mail da pessoa.");
      setSubmitting(false);
      return;
    }
    if (!selectedWorkspaceId) {
      setError("Escolha o workspace que este usuário poderá acessar.");
      setSubmitting(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const nextUser: ManagedUser = {
        id: `demo-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        lastSignInAt: null,
        emailConfirmed: true,
        passwordRotationRequired: true,
        workspaceMemberships: [
          {
            workspaceId: selectedWorkspaceId,
            workspaceName:
              workspaceOptions.find(
                (workspace) => workspace.id === selectedWorkspaceId,
              )?.name ?? "Workspace principal",
            environment:
              workspaceOptions.find(
                (workspace) => workspace.id === selectedWorkspaceId,
              )?.environment ?? "production",
            role: selectedRole,
            excludeFromStatistics: selectedExcludeFromStatistics,
          },
        ],
      };
      persistDemoUsers([nextUser, ...users]);
      setName("");
      setEmail("");
      setSelectedExcludeFromStatistics(false);
      setNotice("Usuário adicionado à demonstração local.");
      setSubmitting(false);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sua sessão expirou. Entre novamente para criar usuários.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        workspaceId: selectedWorkspaceId,
        role: selectedRole,
        excludeFromStatistics: selectedExcludeFromStatistics,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      user?: ManagedUser;
      error?: string;
    };
    if (!response.ok || !body.user) {
      setError(body.error ?? "Não foi possível criar o usuário.");
      setSubmitting(false);
      return;
    }

    setUsers((current) => [body.user as ManagedUser, ...current]);
    setName("");
    setEmail("");
    setSelectedExcludeFromStatistics(false);
    setNotice("Usuário criado. Enviamos um convite para definir a senha.");
    setSubmitting(false);
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteNotice(null);

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError("Informe um e-mail válido para enviar o convite.");
      setInviting(false);
      return;
    }
    if (!inviteWorkspaceId) {
      setInviteError("Escolha o workspace que receberá o usuário.");
      setInviting(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const invitedUser = users.find(
        (managedUser) => managedUser.email.toLowerCase() === normalizedEmail,
      );
      const workspace = workspaceOptions.find(
        (option) => option.id === inviteWorkspaceId,
      );
      if (!invitedUser || !workspace) {
        setInviteError(
          invitedUser
            ? "Escolha um workspace válido."
            : "Não existe uma conta com este e-mail.",
        );
        setInviting(false);
        return;
      }
      const existingMembership = invitedUser.workspaceMemberships.find(
        (membership) => membership.workspaceId === inviteWorkspaceId,
      );
      if (existingMembership) {
        setInviteError("Este usuário já faz parte deste workspace.");
        setInviting(false);
        return;
      }
      const updatedUser: ManagedUser = {
        ...invitedUser,
        workspaceMemberships: [
          ...invitedUser.workspaceMemberships,
          {
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            environment: workspace.environment,
            role: inviteRole,
            excludeFromStatistics: inviteExcludeFromStatistics,
          },
        ],
      };
      persistDemoUsers(
        users.map((managedUser) =>
          managedUser.id === updatedUser.id ? updatedUser : managedUser,
        ),
      );
      setInviteEmail("");
      setInviteExcludeFromStatistics(false);
      setInviteNotice("Acesso liberado no modo demonstração local.");
      setInviting(false);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setInviteError(
        "Sua sessão expirou. Entre novamente para convidar usuários.",
      );
      setInviting(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "invite",
        email: normalizedEmail,
        workspaceId: inviteWorkspaceId,
        role: inviteRole,
        excludeFromStatistics: inviteExcludeFromStatistics,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      invitation?: {
        name?: string;
        workspaceName?: string;
        emailSent?: boolean;
      };
      error?: string;
    };
    if (!response.ok || !body.invitation) {
      setInviteError(body.error ?? "Não foi possível liberar o acesso.");
      setInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteExcludeFromStatistics(false);
    setInviteNotice(
      body.invitation.emailSent
        ? `Acesso liberado${body.invitation.name ? ` para ${body.invitation.name}` : ""}. Enviamos um e-mail com os detalhes.`
        : `Acesso liberado${body.invitation.name ? ` para ${body.invitation.name}` : ""}, mas o e-mail não foi enviado. Confira a configuração do Resend.`,
    );
    await loadUsers();
    setInviting(false);
  }

  function canManageTarget(managedUser: ManagedUser) {
    if (!ownerAccess || managedUser.id === user?.id) return false;
    if (globalAdminAccess || !isSupabaseConfigured) return true;
    const ownedWorkspaceIds = new Set(
      workspaceOptions
        .filter((workspace) => workspace.role === "owner")
        .map((workspace) => workspace.id),
    );
    return (
      managedUser.workspaceMemberships.some(
        (membership) =>
          ownedWorkspaceIds.has(membership.workspaceId) &&
          membership.role !== "owner",
      ) &&
      !managedUser.workspaceMemberships.some(
        (membership) =>
          ownedWorkspaceIds.has(membership.workspaceId) &&
          membership.role === "owner",
      )
    );
  }

  function openResetPassword(managedUser: ManagedUser) {
    setError(null);
    setNotice(null);
    setResetTarget(managedUser);
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setActionLoading(true);
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      setUsers((current) =>
        current.map((managedUser) =>
          managedUser.id === resetTarget.id
            ? { ...managedUser, passwordRotationRequired: true }
            : managedUser,
        ),
      );
      setNotice(`Link de redefinição preparado para ${resetTarget.email}.`);
      setResetTarget(null);
      setActionLoading(false);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sua sessão expirou. Entre novamente para continuar.");
      setActionLoading(false);
      return;
    }
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "reset-password",
        userId: resetTarget.id,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Não foi possível redefinir a senha.");
      setActionLoading(false);
      return;
    }
    setNotice(
      `Enviamos um link para redefinir a senha de ${resetTarget.email}.`,
    );
    setResetTarget(null);
    setActionLoading(false);
  }

  async function handleDeleteUser() {
    if (!deleteTarget || deleteConfirmation.trim() !== "EXCLUIR") return;
    setActionLoading(true);
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      persistDemoUsers(
        users.filter((managedUser) => managedUser.id !== deleteTarget.id),
      );
      setNotice(
        `A conta de ${deleteTarget.name || deleteTarget.email} foi removida.`,
      );
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setActionLoading(false);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sua sessão expirou. Entre novamente para continuar.");
      setActionLoading(false);
      return;
    }
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: deleteTarget.id }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Não foi possível excluir o usuário.");
      setActionLoading(false);
      return;
    }
    setUsers((current) =>
      current.filter((managedUser) => managedUser.id !== deleteTarget.id),
    );
    setNotice(
      `A conta de ${deleteTarget.name || deleteTarget.email} foi excluída.`,
    );
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setActionLoading(false);
  }

  return (
    <DashboardShell activeSection="settings" title="Usuários">
      <div
        className="mx-auto grid max-w-[1180px] gap-[var(--cards-gap)] pb-8"
        data-tour="users-content"
      >
        <section
          className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px] max-[720px]:p-5"
          data-tour="users-header"
        >
          <div className="flex items-start justify-between gap-6 max-[620px]:flex-col">
            <div>
              <h1 className="m-0 max-w-[650px] text-[clamp(25px,2.7vw,32px)] leading-[1.08] font-[600] tracking-[-0.04em]">
                Gerenciar usuários
              </h1>
              <p className="mt-3 mb-0 max-w-[620px] text-[13px] leading-relaxed text-[var(--text-muted)]">
                Crie acessos internos e envie convites para confirmar o e-mail e
                definir uma senha pessoal.
              </p>
            </div>
            <span className="grid size-12 flex-none place-items-center rounded-[16px] bg-[var(--surface-soft)] text-[var(--aqua)]">
              <Icon name="users" size={21} />
            </span>
          </div>
        </section>

        {!adminAccess && (
          <section className="surface-card rounded-[var(--radius-card)] border-[#e8c8c1] bg-[#fff7f4] p-6 text-[12px] text-[#8b4d39]">
            Este espaço é reservado para administradores. Peça a um
            administrador para liberar seu acesso.
          </section>
        )}

        {adminAccess && (
          <>
            {!isSupabaseConfigured && (
              <section className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4 text-[11px] text-[#687780]">
                <span className="grid size-7 flex-none place-items-center rounded-full bg-[var(--surface)] text-[var(--aqua)]">
                  <Icon name="settings" size={15} />
                </span>
                Modo demonstração: os usuários criados aqui ficam salvos somente
                neste navegador até o Supabase ser configurado.
              </section>
            )}

            <section
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(270px,0.8fr)] gap-[var(--cards-gap)] max-[860px]:grid-cols-1"
              data-tour="users-form"
            >
              <form
                className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]"
                onSubmit={handleSubmit}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                      NOVO ACESSO
                    </p>
                    <h2 className="m-0 text-[22px] font-bold tracking-[-0.05em]">
                      Criar usuário
                    </h2>
                    <p className="mt-2 mb-0 text-[11px] text-[#87919a]">
                      O usuário entra como membro da operação.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#87919a]">
                    01 / 01
                  </span>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                    Nome completo
                    <input
                      className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[var(--accent)]"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex.: Mariana Souza"
                      autoComplete="name"
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                    E-mail de acesso
                    <input
                      className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[var(--accent)]"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="mariana@empresa.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                    <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                      Workspace
                      <select
                        className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        value={selectedWorkspaceId}
                        onChange={(event) =>
                          setSelectedWorkspaceId(event.target.value)
                        }
                        disabled={
                          loadingWorkspaces || workspaceOptions.length === 0
                        }
                        required
                      >
                        <option value="">
                          {loadingWorkspaces
                            ? "Carregando…"
                            : workspaceOptions.length === 0
                              ? "Nenhum workspace"
                              : "Escolha um workspace"}
                        </option>
                        {workspaceOptions.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.name} ·{" "}
                            {workspace.environment === "production"
                              ? "Produção"
                              : "Teste"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                      Nível de acesso
                      <select
                        className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none focus:border-[var(--accent)]"
                        value={selectedRole}
                        onChange={(event) =>
                          setSelectedRole(event.target.value as WorkspaceRole)
                        }
                      >
                        {availableRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="-mt-1 mb-0 text-[11px] leading-relaxed text-[#a0a8ad]">
                    {
                      roleOptions.find(
                        (option) => option.value === selectedRole,
                      )?.description
                    }
                  </p>
                  <label className="flex items-start gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] text-[#687780]">
                    <input
                      className="mt-0.5 size-4 accent-[var(--accent)]"
                      type="checkbox"
                      checked={selectedExcludeFromStatistics}
                      onChange={(event) =>
                        setSelectedExcludeFromStatistics(event.target.checked)
                      }
                    />
                    <span className="grid gap-1">
                      <strong className="text-[12px] text-[var(--ink)]">
                        Não contar nas estatísticas
                      </strong>
                      <span>
                        Use para pessoas internas usadas em testes. Elas ficam
                        cadastradas, mas não entram nos indicadores.
                      </span>
                    </span>
                  </label>
                </div>

                {(error || notice) && (
                  <p
                    className={`mt-4 rounded-[12px] px-3.5 py-3 text-[11px] ${error ? "bg-[#fff0ed] text-[#984f3f]" : "bg-[#edf4e8] text-[#527044]"}`}
                    role={error ? "alert" : "status"}
                  >
                    {error ?? notice}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-stretch">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#3b4650] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Enviando convite…" : "Criar e convidar"}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              </form>

              <aside
                className="rounded-[var(--radius-card)] border border-[var(--contrast-line)] p-6 max-[720px]:rounded-[23px]"
                style={{
                  backgroundColor: "var(--contrast-block)",
                  color: "var(--contrast-text)",
                }}
              >
                <h2 className="m-0 max-w-[240px] text-[25px] leading-[1.02] font-bold tracking-[-0.06em]">
                  Regras de acesso
                </h2>
                <div className="mt-8 grid gap-4">
                  {[
                    "Sem cadastro público",
                    "Confirmação do e-mail por convite",
                    "A própria pessoa define a senha",
                  ].map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full border border-[var(--contrast-line)] text-[#d9e2e2]">
                        <Icon name="check" size={12} />
                      </span>
                      <span className="text-[11px] leading-relaxed text-[#c0cbcd]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-white/15 pt-4 text-[10px] leading-relaxed text-[#8f9da1]">
                  O convite leva a pessoa a confirmar o endereço e definir a
                  própria senha.
                </div>
              </aside>
            </section>

            <section
              className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]"
              data-tour="users-invite"
              id="workspace-invite"
            >
              <div className="flex items-start justify-between gap-6 max-[620px]:flex-col">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    CONVITE DE WORKSPACE
                  </p>
                  <h2 className="m-0 text-[22px] font-bold tracking-[-0.05em]">
                    Chamar usuário para este ambiente
                  </h2>
                  <p className="mt-2 mb-0 max-w-[650px] text-[11px] leading-relaxed text-[#87919a]">
                    Libere uma conta já cadastrada em um workspace e envie um
                    e-mail com as informações de acesso.
                  </p>
                </div>
                <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-[#fff1eb] text-[var(--accent)]">
                  <Icon name="bell" size={19} />
                </span>
              </div>

              <form
                className="mt-6 grid grid-cols-[minmax(0,1.4fr)_minmax(190px,0.8fr)_minmax(170px,0.7fr)_auto] items-end gap-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1"
                onSubmit={handleInviteSubmit}
              >
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                  E-mail da conta existente
                  <input
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[var(--accent)]"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="pessoa@empresa.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                  Workspace
                  <select
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    value={inviteWorkspaceId}
                    onChange={(event) =>
                      setInviteWorkspaceId(event.target.value)
                    }
                    disabled={
                      loadingWorkspaces || workspaceOptions.length === 0
                    }
                    required
                  >
                    <option value="">
                      {loadingWorkspaces
                        ? "Carregando…"
                        : "Escolha um workspace"}
                    </option>
                    {workspaceOptions.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} ·{" "}
                        {workspace.environment === "production"
                          ? "Produção"
                          : "Teste"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                  Nível de acesso
                  <select
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none focus:border-[var(--accent)]"
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as WorkspaceRole)
                    }
                  >
                    {availableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 flex items-start gap-2 text-[10px] font-normal tracking-normal text-[#687780] normal-case">
                    <input
                      className="mt-0.5 size-4 accent-[var(--accent)]"
                      type="checkbox"
                      checked={inviteExcludeFromStatistics}
                      onChange={(event) =>
                        setInviteExcludeFromStatistics(event.target.checked)
                      }
                    />
                    <span>Não contar nos indicadores</span>
                  </span>
                </label>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#3b4650] disabled:cursor-not-allowed disabled:opacity-60 max-[980px]:col-span-2 max-[560px]:col-span-1"
                  type="submit"
                  disabled={
                    inviting ||
                    loadingWorkspaces ||
                    workspaceOptions.length === 0
                  }
                >
                  {inviting ? "Liberando…" : "Liberar acesso"}
                  <Icon name="arrow" size={15} />
                </button>
              </form>

              {(inviteError || inviteNotice) && (
                <p
                  className={`mt-4 rounded-[12px] px-3.5 py-3 text-[11px] ${inviteError ? "bg-[#fff0ed] text-[#984f3f]" : "bg-[#edf4e8] text-[#527044]"}`}
                  role={inviteError ? "alert" : "status"}
                >
                  {inviteError ?? inviteNotice}
                </p>
              )}
            </section>

            <section className="grid grid-cols-3 gap-[var(--cards-gap)] max-[700px]:grid-cols-1">
              {[
                ["Usuários", users.length, "contas no ambiente"],
                ["Ativos", activeUsers, "e-mails confirmados"],
                ["Troca pendente", pendingPasswordChanges, "primeiro acesso"],
              ].map(([label, value, description]) => (
                <article
                  className="surface-card rounded-[var(--radius-card)] p-5 max-[720px]:rounded-[23px]"
                  key={label}
                >
                  <p className="m-0 text-[10px] text-[#89939a]">{label}</p>
                  <p className="mt-3 mb-1 text-[32px] leading-none font-light tracking-[-0.06em] text-[var(--ink)]">
                    {value}
                  </p>
                  <p className="m-0 text-[10px] text-[#a0a8ad]">
                    {description}
                  </p>
                </article>
              ))}
            </section>

            <section
              className="surface-card overflow-hidden rounded-[var(--radius-card)] max-[720px]:rounded-[23px]"
              data-tour="users-list"
            >
              <div className="flex items-end justify-between gap-4 border-b border-[var(--line-soft)] px-6 py-5 max-[620px]:flex-col max-[620px]:items-start">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    DIRETÓRIO DO AMBIENTE
                  </p>
                  <h2 className="m-0 text-[21px] font-bold tracking-[-0.05em]">
                    Usuários cadastrados
                  </h2>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-[11px] border border-[var(--line)] px-3 py-2 text-[10px] font-bold text-[#6e7c84] transition-colors hover:border-[var(--text-muted)]"
                  type="button"
                  onClick={() => void loadUsers()}
                  disabled={loadingUsers || !isSupabaseConfigured}
                >
                  <Icon name="refresh" size={14} />
                  {loadingUsers ? "Atualizando…" : "Atualizar lista"}
                </button>
              </div>

              {loadingUsers ? (
                <p className="px-6 py-8 text-[12px] text-[#8e989d]">
                  Carregando usuários…
                </p>
              ) : users.length === 0 ? (
                <p className="px-6 py-8 text-[12px] text-[#8e989d]">
                  Nenhum usuário cadastrado ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--line-soft)] text-[9px] font-extrabold tracking-[0.14em] text-[#9aa3a8] uppercase">
                        <th className="px-6 py-3 font-extrabold">Pessoa</th>
                        <th className="px-4 py-3 font-extrabold">Workspace</th>
                        <th className="px-4 py-3 font-extrabold">Nível</th>
                        <th className="px-4 py-3 font-extrabold">Acesso</th>
                        <th className="px-4 py-3 font-extrabold">Criado em</th>
                        <th className="px-6 py-3 text-right font-extrabold">
                          Último acesso
                        </th>
                        <th className="px-6 py-3 text-right font-extrabold">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersTable.getRowModel().rows.map((row) => {
                        const managedUser = row.original;
                        return (
                          <tr
                            className="border-b border-[var(--line-soft)] last:border-b-0"
                            key={managedUser.id}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--surface-soft)] text-[10px] font-bold text-[var(--ink)]">
                                  {getInitials(
                                    managedUser.name,
                                    managedUser.email,
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <strong className="block truncate text-[12px] font-bold text-[var(--ink)]">
                                    {managedUser.name || "Sem nome"}
                                  </strong>
                                  <span className="block truncate text-[10px] text-[#8b969c]">
                                    {managedUser.email}
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-1">
                                {managedUser.workspaceMemberships.length ? (
                                  managedUser.workspaceMemberships.map(
                                    (membership) => (
                                      <span
                                        className="block max-w-[190px] truncate text-[11px] text-[var(--ink)]"
                                        key={`${managedUser.id}-${membership.workspaceId}`}
                                      >
                                        {membership.workspaceName}
                                      </span>
                                    ),
                                  )
                                ) : (
                                  <span className="text-[11px] text-[#a0a8ad]">
                                    Sem workspace
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-1.5">
                                {managedUser.workspaceMemberships.length ? (
                                  managedUser.workspaceMemberships.map(
                                    (membership) => (
                                      <span
                                        className="grid gap-1"
                                        key={`${managedUser.id}-${membership.workspaceId}-role`}
                                      >
                                        <span className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-bold text-[#687780]">
                                          {roleLabel(membership.role)}
                                        </span>
                                        {membership.excludeFromStatistics ? (
                                          <span className="inline-flex w-fit rounded-full bg-[#fff1eb] px-2.5 py-1 text-[9px] font-bold text-[#a45e4b]">
                                            Fora dos indicadores
                                          </span>
                                        ) : null}
                                      </span>
                                    ),
                                  )
                                ) : (
                                  <span className="text-[11px] text-[#a0a8ad]">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${managedUser.passwordRotationRequired ? "bg-[#fff1e8] text-[#9a603f]" : "bg-[#edf4e8] text-[#5c784b]"}`}
                              >
                                {managedUser.passwordRotationRequired
                                  ? "Troca pendente"
                                  : "Ativo"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[10px] text-[#87939a]">
                              {formatDate(managedUser.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right text-[10px] text-[#87939a]">
                              {formatDate(managedUser.lastSignInAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {canManageTarget(managedUser) ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--line)] px-2.5 py-2 text-[10px] font-bold text-[#687780] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    onClick={() =>
                                      openResetPassword(managedUser)
                                    }
                                    disabled={actionLoading}
                                  >
                                    <Icon name="settings" size={12} />
                                    Redefinir
                                  </button>
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#efc6bc] px-2.5 py-2 text-[10px] font-bold text-[#a14e3d] transition-colors hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    onClick={() => {
                                      setDeleteTarget(managedUser);
                                      setDeleteConfirmation("");
                                      setError(null);
                                      setNotice(null);
                                    }}
                                    disabled={actionLoading}
                                  >
                                    <Icon name="close" size={12} />
                                    Excluir
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#b0b7ba]">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {resetTarget && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#18202b]/35 px-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setResetTarget(null);
            }
          }}
        >
          <form
            className="w-full max-w-[460px] rounded-[24px] border border-[var(--line)] bg-white p-6 shadow-[0_24px_70px_rgba(24,32,43,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-user-password-title"
            onSubmit={(event) => void handleResetPassword(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9a603f] uppercase">
                  ZONA DE ACESSO
                </p>
                <h2
                  className="m-0 text-[24px] font-bold tracking-[-0.05em] text-[var(--ink)]"
                  id="reset-user-password-title"
                >
                  Enviar link de redefinição
                </h2>
                <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[#7f8991]">
                  Enviaremos para {resetTarget.email} um link individual para
                  criar uma nova senha. A senha atual só muda quando a pessoa
                  concluir o processo.
                </p>
              </div>
              <button
                className="grid size-9 flex-none place-items-center rounded-[11px] border border-[var(--line)] text-[#7d8990] transition-colors hover:bg-[#f4f6f6]"
                type="button"
                aria-label="Fechar redefinição de senha"
                onClick={() => setResetTarget(null)}
                disabled={actionLoading}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            {error && (
              <p
                className="mt-4 rounded-[12px] bg-[#fff0ed] px-3.5 py-3 text-[11px] text-[#984f3f]"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-11 rounded-[13px] border border-[var(--line)] px-4 text-[12px] font-bold text-[#687780] transition-colors hover:bg-[#f5f7f7]"
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-[13px] bg-[var(--ink)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#3b4650] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? "Enviando…" : "Enviar link"}
                <Icon name="arrow" size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#18202b]/35 px-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="w-full max-w-[460px] rounded-[24px] border border-[#efc6bc] bg-white p-6 shadow-[0_24px_70px_rgba(24,32,43,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#a14e3d] uppercase">
                  AÇÃO PERMANENTE
                </p>
                <h2
                  className="m-0 text-[24px] font-bold tracking-[-0.05em] text-[var(--ink)]"
                  id="delete-user-title"
                >
                  Excluir usuário
                </h2>
                <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[#7f8991]">
                  A conta de {deleteTarget.name || deleteTarget.email} será
                  removida do Auth e perderá o acesso a todos os workspaces.
                </p>
              </div>
              <button
                className="grid size-9 flex-none place-items-center rounded-[11px] border border-[var(--line)] text-[#7d8990] transition-colors hover:bg-[#f4f6f6]"
                type="button"
                aria-label="Fechar exclusão de usuário"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="mt-5 rounded-[14px] bg-[#fff4f0] px-4 py-3 text-[11px] leading-relaxed text-[#8d4c3d]">
              Esta ação não pode ser desfeita. Para continuar, digite
              <strong className="mx-1 font-extrabold">EXCLUIR</strong> abaixo.
            </div>
            <label className="mt-5 grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
              Confirmação
              <input
                className="h-12 rounded-[14px] border border-[#efc6bc] bg-[#fffafa] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] uppercase outline-none focus:border-[#c77968]"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="EXCLUIR"
                autoComplete="off"
              />
            </label>
            {error && (
              <p
                className="mt-4 rounded-[12px] bg-[#fff0ed] px-3.5 py-3 text-[11px] text-[#984f3f]"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-11 rounded-[13px] border border-[var(--line)] px-4 text-[12px] font-bold text-[#687780] transition-colors hover:bg-[#f5f7f7]"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-[13px] bg-[#b45d4b] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#994c3d] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void handleDeleteUser()}
                disabled={
                  actionLoading || deleteConfirmation.trim() !== "EXCLUIR"
                }
              >
                {actionLoading ? "Excluindo…" : "Excluir usuário"}
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export function UserManagementPage() {
  return (
    <AuthGuard>
      <UserManagementContent />
    </AuthGuard>
  );
}
