"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal } from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useDialogScrollLock } from "@/components/ui/use-dialog-scroll-lock";
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
  isGlobalAdmin: boolean;
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
    isGlobalAdmin: true,
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
    isGlobalAdmin: false,
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
    isGlobalAdmin: false,
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
  const [activePanel, setActivePanel] = useState<
    "directory" | "create" | "invite"
  >("directory");
  const [delivery, setDelivery] = useState<"email" | "link">("link");
  const [inviteRecipient, setInviteRecipient] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>(demoUsers);
  const filteredUsers = useMemo(() => {
    const normalizedSearch = directorySearch.trim().toLocaleLowerCase("pt-BR");
    return users.filter((person) =>
      [
        person.name,
        person.email,
        ...person.workspaceMemberships.map(
          (membership) => membership.workspaceName,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [directorySearch, users]);
  const usersTable = useReactTable({
    data: filteredUsers,
    columns: managedUserColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
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
  const userDialogRef = useRef<HTMLDivElement>(null);
  const resetDialogRef = useRef<HTMLFormElement>(null);
  useDialogScrollLock(Boolean(resetTarget), resetDialogRef);
  useDialogScrollLock(Boolean(deleteTarget), userDialogRef);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const globalAdminAccess = isGlobalAdminUser(user);
  const adminAccess =
    !isSupabaseConfigured ||
    globalAdminAccess ||
    workspaceOptions.some(
      (workspace) => workspace.role === "owner" || workspace.role === "admin",
    );
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
            isGlobalAdmin: managedUser.isGlobalAdmin === true,
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
    setActivePanel("invite");
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
    setInviteLink(null);
    setCopyNotice("");
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
        isGlobalAdmin: false,
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
        delivery,
        workspaceId: selectedWorkspaceId,
        role: selectedRole,
        excludeFromStatistics: selectedExcludeFromStatistics,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      user?: ManagedUser;
      inviteLink?: string;
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
    setInviteRecipient(email.trim());
    setInviteLink(body.inviteLink ?? null);
    setCopyNotice("");
    setNotice(
      body.inviteLink
        ? "Acesso criado. Compartilhe o link em um canal privado após confirmar a identidade da pessoa."
        : "Usuário criado. Enviamos um convite para definir a senha.",
    );
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
        statsUpdated?: boolean;
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
    const recipient = body.invitation.name
      ? ` para ${body.invitation.name}`
      : "";
    const emailStatus = body.invitation.emailSent
      ? "Enviamos um e-mail com os detalhes."
      : "O e-mail não foi enviado; confira a configuração do Resend.";
    const statsStatus = body.invitation.statsUpdated
      ? ""
      : " Os indicadores do workspace não foram atualizados.";
    setInviteNotice(
      `Acesso liberado${recipient}. ${emailStatus}${statsStatus}`,
    );
    await loadUsers();
    setInviting(false);
  }

  function canManageTarget(managedUser: ManagedUser) {
    if (!adminAccess || managedUser.id === user?.id) return false;
    if (managedUser.isGlobalAdmin && !globalAdminAccess) return false;
    if (globalAdminAccess || !isSupabaseConfigured) return true;
    const managedWorkspaceIds = new Set(
      workspaceOptions
        .filter(
          (workspace) =>
            workspace.role === "owner" || workspace.role === "admin",
        )
        .map((workspace) => workspace.id),
    );
    const ownedWorkspaceIds = new Set(
      workspaceOptions
        .filter((workspace) => workspace.role === "owner")
        .map((workspace) => workspace.id),
    );
    const workspaceScope = ownedWorkspaceIds.size
      ? ownedWorkspaceIds
      : managedWorkspaceIds;
    return (
      managedUser.workspaceMemberships.some((membership) =>
        workspaceScope.has(membership.workspaceId),
      ) &&
      !managedUser.workspaceMemberships.some(
        (membership) => membership.role === "owner",
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

  async function handleResendInvite(
    managedUser: ManagedUser,
    delivery: "email" | "link" = "email",
  ) {
    if (managedUser.emailConfirmed) return;
    setInviteLink(null);
    setCopyNotice("");
    setActionLoading(true);
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      setNotice(`Convite simulado para ${managedUser.email}.`);
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
        action: "resend-invite",
        delivery,
        userId: managedUser.id,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      inviteLink?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Não foi possível reenviar o convite.");
      setActionLoading(false);
      return;
    }
    if (body.inviteLink) {
      setInviteRecipient(managedUser.email);
      setInviteLink(body.inviteLink);
      setCopyNotice("");
      setActivePanel("create");
      setNotice(`Link gerado para ${managedUser.email}.`);
    } else {
      setNotice(`Convite reenviado para ${managedUser.email}.`);
    }
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
        className="users-page mx-auto grid max-w-[1180px] gap-[var(--cards-gap)] pb-8"
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
            <span className="users-header-count">{users.length} contas</span>
          </div>
        </section>

        {!adminAccess && (
          <section className="surface-card rounded-[var(--radius-card)] border-[var(--line)] bg-[var(--surface-soft)] p-6 text-[12px] text-[var(--text-muted)]">
            Este espaço é reservado para administradores. Peça a um
            administrador para liberar seu acesso.
          </section>
        )}

        {adminAccess && (
          <>
            {!isSupabaseConfigured && (
              <section className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4 text-[11px] text-[var(--text-muted)]">
                <span className="grid size-7 flex-none place-items-center rounded-full bg-[var(--surface)] text-[var(--aqua)]">
                  <Icon name="settings" size={15} />
                </span>
                Modo demonstração: os usuários criados aqui ficam salvos somente
                neste navegador até o Supabase ser configurado.
              </section>
            )}

            {(error || notice) && activePanel !== "create" && (
              <p className="users-feedback" role={error ? "alert" : "status"}>
                {error ?? notice}
              </p>
            )}
            <nav className="users-panel-nav" aria-label="Gestão de usuários">
              {(
                [
                  { id: "directory", label: "Diretório" },
                  { id: "create", label: "Criar acesso" },
                  { id: "invite", label: "Vincular conta existente" },
                ] as const
              ).map((panel) => (
                <button
                  type="button"
                  key={panel.id}
                  aria-current={activePanel === panel.id ? "page" : undefined}
                  onClick={() => setActivePanel(panel.id)}
                >
                  {panel.label}
                </button>
              ))}
            </nav>
            <section
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(270px,0.8fr)] gap-[var(--cards-gap)] max-[860px]:grid-cols-1"
              data-tour="users-form"
              data-users-panel="create"
              hidden={activePanel !== "create"}
            >
              <form
                className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]"
                onSubmit={handleSubmit}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                      NOVO ACESSO
                    </p>
                    <h2 className="m-0 text-[22px] font-bold tracking-[-0.05em]">
                      Criar usuário
                    </h2>
                    <p className="mt-2 mb-0 text-[11px] text-[var(--text-muted)]">
                      O usuário entra como membro da operação.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                    01 / 01
                  </span>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm text-[var(--text-muted)]">
                    Entrega do convite
                    <select
                      className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-[var(--ink)] focus:bg-[var(--surface)]"
                      value={delivery}
                      onChange={(event) =>
                        setDelivery(event.target.value as "email" | "link")
                      }
                    >
                      <option value="link">
                        Link privado · sem enviar e-mail
                      </option>
                      <option value="email">Enviar por e-mail</option>
                    </select>
                    <span>
                      O e-mail identifica a conta. No convite por link, confirme
                      a identidade por outro canal antes de compartilhar.
                    </span>
                  </label>
                  <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                    Nome completo
                    <input
                      className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex.: Mariana Souza"
                      autoComplete="name"
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                    E-mail de acesso
                    <input
                      className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="mariana@empresa.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                    <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                      Workspace
                      <select
                        className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
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
                    <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                      Nível de acesso
                      <select
                        className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors focus:border-[var(--accent)]"
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
                  <p className="-mt-1 mb-0 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {
                      roleOptions.find(
                        (option) => option.value === selectedRole,
                      )?.description
                    }
                  </p>
                  <label className="flex items-start gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
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

                {inviteLink && (
                  <section
                    className="mt-4 grid gap-3 rounded-xl border border-[var(--line)] p-5"
                    aria-label="Convite privado"
                  >
                    <h2 className="m-0 text-base font-semibold">
                      Link privado de primeiro acesso · {inviteRecipient}
                    </h2>
                    <p className="m-0 text-sm text-[var(--text-muted)]">
                      Uso único, com validade definida na autenticação. Quem
                      tiver o link poderá ativar a conta e definir a senha.
                      Compartilhe somente com a pessoa correta. Este processo
                      não comprova a posse da caixa de e-mail.
                    </p>
                    <input
                      aria-label="Link privado para copiar"
                      type="password"
                      readOnly
                      autoComplete="off"
                      value={inviteLink}
                      onFocus={(event) => event.target.select()}
                      className="h-10 min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 focus:bg-[var(--surface)]"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-[var(--canvas)] focus:underline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteLink);
                            setCopyNotice("Link copiado.");
                          } catch {
                            setCopyNotice(
                              "Não foi possível copiar. Selecione o link no campo acima.",
                            );
                          }
                        }}
                      >
                        Copiar link privado
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm focus:underline"
                        onClick={() => {
                          setInviteLink(null);
                          setCopyNotice("");
                        }}
                      >
                        Ocultar link
                      </button>
                    </div>
                    {copyNotice && (
                      <p role="status" className="m-0 text-sm">
                        {copyNotice}
                      </p>
                    )}
                  </section>
                )}
                {(error || notice) && (
                  <p
                    className="mt-4 rounded-[12px] bg-[var(--surface-soft)] px-3.5 py-3 text-[11px] text-[var(--text-muted)]"
                    role={error ? "alert" : "status"}
                  >
                    {error ?? notice}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-stretch">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[12px] font-bold text-[var(--canvas)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Preparando acesso…"
                      : delivery === "link"
                        ? "Criar e gerar link"
                        : "Criar e convidar"}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              </form>

              <aside className="users-access-guide">
                <h2 className="m-0 max-w-[240px] text-[25px] leading-[1.02] font-bold tracking-[-0.06em]">
                  Regras de acesso
                </h2>
                <div className="mt-8 grid gap-4">
                  {[
                    "Sem cadastro público",
                    "Convite privado de uso único",
                    "A própria pessoa define a senha",
                  ].map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full border border-[var(--contrast-line)] text-[var(--text-muted)]">
                        <Icon name="check" size={12} />
                      </span>
                      <span className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-white/15 pt-4 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  No convite por link, confirme a identidade por outro canal. A
                  pessoa define a própria senha no primeiro acesso.
                </div>
              </aside>
            </section>

            <section
              className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]"
              data-tour="users-invite"
              data-users-panel="invite"
              hidden={activePanel !== "invite"}
              id="workspace-invite"
            >
              <div className="flex items-start justify-between gap-6 max-[620px]:flex-col">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                    CONVITE DE WORKSPACE
                  </p>
                  <h2 className="m-0 text-[22px] font-bold tracking-[-0.05em]">
                    Chamar usuário para este ambiente
                  </h2>
                  <p className="mt-2 mb-0 max-w-[650px] text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Libere uma conta já cadastrada em um workspace e envie um
                    e-mail com as informações de acesso.
                  </p>
                </div>
                <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-[var(--surface-soft)] text-[var(--accent)]">
                  <Icon name="bell" size={19} />
                </span>
              </div>

              <form
                className="mt-6 grid grid-cols-[minmax(0,1.4fr)_minmax(190px,0.8fr)_minmax(170px,0.7fr)_auto] items-end gap-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1"
                onSubmit={handleInviteSubmit}
              >
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                  E-mail da conta existente
                  <input
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="pessoa@empresa.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                  Workspace
                  <select
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
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
                <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                  Nível de acesso
                  <select
                    className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors focus:border-[var(--accent)]"
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
                  <span className="mt-1 flex items-start gap-2 text-[10px] font-normal tracking-normal text-[var(--text-muted)] normal-case">
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
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[12px] font-bold text-[var(--canvas)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-60 max-[980px]:col-span-2 max-[560px]:col-span-1"
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
                  className="mt-4 rounded-[12px] bg-[var(--surface-soft)] px-3.5 py-3 text-[11px] text-[var(--text-muted)]"
                  role={inviteError ? "alert" : "status"}
                >
                  {inviteError ?? inviteNotice}
                </p>
              )}
            </section>

            <section
              className="users-directory-summary"
              data-users-panel="directory"
              hidden={activePanel !== "directory"}
            >
              {[
                ["Usuários", users.length, "contas no ambiente"],
                ["Ativos", activeUsers, "e-mails confirmados"],
                ["Troca pendente", pendingPasswordChanges, "primeiro acesso"],
              ].map(([label, value, description]) => (
                <article
                  className="surface-card rounded-[var(--radius-card)] p-5 max-[720px]:rounded-[23px]"
                  key={label}
                >
                  <p className="m-0 text-[10px] text-[var(--text-muted)]">
                    {label}
                  </p>
                  <p className="mt-3 mb-1 text-[32px] leading-none font-light tracking-[-0.06em] text-[var(--ink)]">
                    {value}
                  </p>
                  <p className="m-0 text-[10px] text-[var(--text-muted)]">
                    {description}
                  </p>
                </article>
              ))}
            </section>

            <label
              className="users-directory-search"
              data-users-panel="directory"
              hidden={activePanel !== "directory"}
            >
              Buscar pessoa ou workspace
              <input
                type="search"
                placeholder="Nome, e-mail ou workspace"
                value={directorySearch}
                onChange={(event) => setDirectorySearch(event.target.value)}
              />
            </label>
            <section
              className="surface-card overflow-hidden rounded-[var(--radius-card)] max-[720px]:rounded-[23px]"
              data-tour="users-list"
              data-users-panel="directory"
              hidden={activePanel !== "directory"}
            >
              <div className="flex items-end justify-between gap-4 border-b border-[var(--line-soft)] px-6 py-5 max-[620px]:flex-col max-[620px]:items-start">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                    DIRETÓRIO DO AMBIENTE
                  </p>
                  <h2 className="m-0 text-[21px] font-bold tracking-[-0.05em]">
                    Usuários cadastrados
                  </h2>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-[11px] border border-[var(--line)] px-3 py-2 text-[10px] font-bold text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)]"
                  type="button"
                  onClick={() => void loadUsers()}
                  disabled={loadingUsers || !isSupabaseConfigured}
                >
                  <Icon name="refresh" size={14} />
                  {loadingUsers ? "Atualizando…" : "Atualizar lista"}
                </button>
              </div>

              {loadingUsers ? (
                <p className="px-6 py-8 text-[12px] text-[var(--text-muted)]">
                  Carregando usuários…
                </p>
              ) : usersTable.getRowModel().rows.length === 0 ? (
                <p className="px-6 py-8 text-[12px] text-[var(--text-muted)]">
                  {users.length === 0
                    ? "Nenhum usuário cadastrado ainda."
                    : "Nenhuma conta corresponde à busca."}
                </p>
              ) : (
                <div className="users-directory-container">
                  <table className="users-directory-table w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--line-soft)] text-[9px] font-extrabold tracking-[0.14em] text-[var(--text-muted)] uppercase">
                        <th scope="col" className="px-6 py-3 font-extrabold">
                          Pessoa
                        </th>
                        <th scope="col" className="px-4 py-3 font-extrabold">
                          Workspace
                        </th>
                        <th scope="col" className="px-4 py-3 font-extrabold">
                          Nível
                        </th>
                        <th scope="col" className="px-4 py-3 font-extrabold">
                          Acesso
                        </th>
                        <th scope="col" className="px-4 py-3 font-extrabold">
                          Criado em
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right font-extrabold"
                        >
                          Último acesso
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right font-extrabold"
                        >
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
                            <td data-label="Pessoa" className="px-6 py-4">
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
                                  <span className="block truncate text-[10px] text-[var(--text-muted)]">
                                    {managedUser.email}
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td data-label="Workspace" className="px-4 py-4">
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
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    Sem workspace
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="Nível" className="px-4 py-4">
                              <div className="grid gap-1.5">
                                {managedUser.workspaceMemberships.length ? (
                                  managedUser.workspaceMemberships.map(
                                    (membership) => (
                                      <span
                                        className="grid gap-1"
                                        key={`${managedUser.id}-${membership.workspaceId}-role`}
                                      >
                                        <span className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--text-muted)]">
                                          {roleLabel(membership.role)}
                                        </span>
                                        {membership.excludeFromStatistics ? (
                                          <span className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--text-muted)]">
                                            Fora dos indicadores
                                          </span>
                                        ) : null}
                                      </span>
                                    ),
                                  )
                                ) : (
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="Acesso" className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--text-muted)]">
                                {!managedUser.emailConfirmed
                                  ? "Convite pendente"
                                  : managedUser.passwordRotationRequired
                                    ? "Troca pendente"
                                    : "Ativo"}
                              </span>
                            </td>
                            <td
                              data-label="Criado em"
                              className="px-4 py-4 text-[10px] text-[var(--text-muted)]"
                            >
                              {formatDate(managedUser.createdAt)}
                            </td>
                            <td
                              data-label="Último acesso"
                              className="px-6 py-4 text-right text-[10px] text-[var(--text-muted)]"
                            >
                              {formatDate(managedUser.lastSignInAt)}
                            </td>
                            <td
                              data-label="Ações"
                              className="px-6 py-4 text-right"
                            >
                              {canManageTarget(managedUser) ? (
                                <Menu.Root>
                                  <Menu.Trigger
                                    className="users-actions-trigger"
                                    aria-label={`Ações de ${managedUser.name || managedUser.email}`}
                                    disabled={actionLoading}
                                  >
                                    <MoreHorizontal
                                      size={18}
                                      aria-hidden="true"
                                    />
                                  </Menu.Trigger>
                                  <Menu.Portal>
                                    <Menu.Positioner
                                      sideOffset={8}
                                      align="end"
                                      className="z-50"
                                    >
                                      <Menu.Popup className="users-actions-menu">
                                        {managedUser.emailConfirmed ? (
                                          <Menu.Item
                                            className="users-actions-item"
                                            disabled={actionLoading}
                                            onClick={() =>
                                              openResetPassword(managedUser)
                                            }
                                          >
                                            <Icon name="settings" size={16} />{" "}
                                            Redefinir senha
                                          </Menu.Item>
                                        ) : (
                                          <>
                                            <Menu.Item
                                              className="users-actions-item"
                                              disabled={actionLoading}
                                              onClick={() =>
                                                void handleResendInvite(
                                                  managedUser,
                                                )
                                              }
                                            >
                                              <Icon name="arrow" size={16} />{" "}
                                              Reenviar convite
                                            </Menu.Item>
                                            <Menu.Item
                                              className="users-actions-item"
                                              disabled={actionLoading}
                                              onClick={() =>
                                                void handleResendInvite(
                                                  managedUser,
                                                  "link",
                                                )
                                              }
                                            >
                                              <Icon name="plus" size={16} />{" "}
                                              Gerar link privado
                                            </Menu.Item>
                                          </>
                                        )}
                                        <Menu.Separator className="users-actions-separator" />
                                        <Menu.Item
                                          className="users-actions-item"
                                          disabled={actionLoading}
                                          onClick={() => {
                                            setDeleteTarget(managedUser);
                                            setDeleteConfirmation("");
                                            setError(null);
                                            setNotice(null);
                                          }}
                                        >
                                          <Icon name="close" size={16} />{" "}
                                          Excluir usuário
                                        </Menu.Item>
                                      </Menu.Popup>
                                    </Menu.Positioner>
                                  </Menu.Portal>
                                </Menu.Root>
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)]">
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
              {!loadingUsers && filteredUsers.length > 0 && (
                <div className="flex items-center justify-between gap-4 border-t border-[var(--line-soft)] px-6 py-4 max-[520px]:flex-col max-[520px]:items-stretch">
                  <p className="m-0 text-[11px] text-[var(--text-muted)]">
                    Mostrando{" "}
                    {usersTable.getState().pagination.pageIndex * 25 + 1}–
                    {Math.min(
                      (usersTable.getState().pagination.pageIndex + 1) * 25,
                      filteredUsers.length,
                    )}{" "}
                    de {filteredUsers.length} contas
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      aria-live="polite"
                      className="min-w-16 text-center text-[11px] text-[var(--text-muted)]"
                    >
                      Página {usersTable.getState().pagination.pageIndex + 1} de{" "}
                      {Math.max(usersTable.getPageCount(), 1)}
                    </span>
                    <button
                      className="h-9 rounded-[10px] border border-[var(--line)] px-3 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!usersTable.getCanPreviousPage()}
                      onClick={() => usersTable.previousPage()}
                      type="button"
                    >
                      Anterior
                    </button>
                    <button
                      className="h-9 rounded-[10px] border border-[var(--line)] px-3 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!usersTable.getCanNextPage()}
                      onClick={() => usersTable.nextPage()}
                      type="button"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {resetTarget && (
        <div
          className="users-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setResetTarget(null);
            }
          }}
        >
          <form
            ref={resetDialogRef}
            className="users-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-user-password-title"
            onSubmit={(event) => void handleResetPassword(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                  ZONA DE ACESSO
                </p>
                <h2
                  className="m-0 text-[24px] font-bold tracking-[-0.05em] text-[var(--ink)]"
                  id="reset-user-password-title"
                >
                  Enviar link de redefinição
                </h2>
                <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--text-muted)]">
                  Enviaremos para {resetTarget.email} um link individual para
                  criar uma nova senha. A senha atual só muda quando a pessoa
                  concluir o processo.
                </p>
              </div>
              <button
                className="grid size-9 flex-none place-items-center rounded-[11px] border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
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
                className="mt-4 rounded-[12px] bg-[var(--surface-soft)] px-3.5 py-3 text-[11px] text-[var(--text-muted)]"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-11 rounded-[13px] border border-[var(--line)] px-4 text-[12px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-[13px] bg-[var(--ink)] px-4 text-[12px] font-bold text-[var(--canvas)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-60"
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
          className="users-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            ref={userDialogRef}
            className="users-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                  AÇÃO PERMANENTE
                </p>
                <h2
                  className="m-0 text-[24px] font-bold tracking-[-0.05em] text-[var(--ink)]"
                  id="delete-user-title"
                >
                  Excluir usuário
                </h2>
                <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--text-muted)]">
                  A conta de {deleteTarget.name || deleteTarget.email} será
                  removida do Auth e perderá o acesso a todos os workspaces.
                </p>
              </div>
              <button
                className="grid size-9 flex-none place-items-center rounded-[11px] border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                type="button"
                aria-label="Fechar exclusão de usuário"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="mt-5 rounded-[14px] bg-[var(--surface-soft)] px-4 py-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
              Esta ação não pode ser desfeita. Para continuar, digite
              <strong className="mx-1 font-extrabold">EXCLUIR</strong> abaixo.
            </div>
            <label className="mt-5 grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-muted)] uppercase">
              Confirmação
              <input
                className="h-12 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] uppercase focus:border-[var(--line)]"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="EXCLUIR"
                autoComplete="off"
              />
            </label>
            {error && (
              <p
                className="mt-4 rounded-[12px] bg-[var(--surface-soft)] px-3.5 py-3 text-[11px] text-[var(--text-muted)]"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-11 rounded-[13px] border border-[var(--line)] px-4 text-[12px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-[13px] bg-[var(--surface-soft)] px-4 text-[12px] font-bold text-[var(--canvas)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
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
