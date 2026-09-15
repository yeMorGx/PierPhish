"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  const values = new Uint32Array(16);
  window.crypto.getRandomValues(values);
  const password = Array.from(
    values,
    (value) => alphabet[value % alphabet.length],
  );
  password[2] = symbols[values[2] % symbols.length];
  password[7] = String(values[7] % 10);
  return password.join("");
}

function isGlobalAdminUser(user: ReturnType<typeof useAuth>["user"]) {
  if (!isSupabaseConfigured) return true;
  if (user?.email?.toLowerCase() === superAdminEmail) return true;
  const metadata = user?.app_metadata as
    | { role?: unknown; is_admin?: unknown }
    | undefined;
  return (
    metadata?.is_admin === true ||
    metadata?.role === "admin" ||
    metadata?.role === "owner" ||
    metadata?.role === "super_admin"
  );
}

export function UserManagementContent() {
  const { ready, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>(demoUsers);
  const [loadingUsers, setLoadingUsers] = useState(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(
    [],
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("viewer");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] =
    useState(isSupabaseConfigured);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (localWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return localWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (localWorkspaces[0]?.id ?? "");
    });
    setInviteWorkspaceId((current) => {
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
  }, []);

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
      if (nextWorkspaces.some((workspace) => workspace.id === current)) {
        return current;
      }
      const active = readActiveWorkspaceId();
      return nextWorkspaces.some((workspace) => workspace.id === active)
        ? active
        : (nextWorkspaces[0]?.id ?? "");
    });
    setInviteWorkspaceId((current) => {
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

    if (!name.trim() || !email.trim() || password.length < 12) {
      setError(
        "Preencha nome, e-mail e uma senha inicial de pelo menos 12 caracteres.",
      );
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
          },
        ],
      };
      persistDemoUsers([nextUser, ...users]);
      setName("");
      setEmail("");
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
        password,
        workspaceId: selectedWorkspaceId,
        role: selectedRole,
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
    setPassword("");
    setNotice("Usuário criado. Compartilhe a senha inicial com segurança.");
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
          },
        ],
      };
      persistDemoUsers(
        users.map((managedUser) =>
          managedUser.id === updatedUser.id ? updatedUser : managedUser,
        ),
      );
      setInviteEmail("");
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
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      invitation?: { name?: string; workspaceName?: string };
      error?: string;
    };
    if (!response.ok || !body.invitation) {
      setInviteError(body.error ?? "Não foi possível liberar o acesso.");
      setInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteNotice(
      `Acesso liberado${body.invitation.name ? ` para ${body.invitation.name}` : ""}. Uma notificação foi enviada.`,
    );
    await loadUsers();
    setInviting(false);
  }

  return (
    <DashboardShell activeSection="settings" title="Usuários">
      <div className="mx-auto grid max-w-[1180px] gap-[var(--cards-gap)] pb-8">
        <section className="surface-card rounded-[var(--radius-card)] p-8 max-[720px]:rounded-[23px] max-[720px]:p-6">
          <div className="flex items-start justify-between gap-6 max-[620px]:flex-col">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                ADMINISTRAÇÃO / ACESSOS
              </p>
              <h1 className="m-0 max-w-[650px] text-[clamp(30px,4vw,52px)] leading-[0.96] font-[680] tracking-[-0.07em]">
                Pessoas certas, com acesso certo.
              </h1>
              <p className="mt-4 mb-0 max-w-[620px] text-[13px] leading-relaxed text-[#7b838d]">
                Crie acessos internos para o time e entregue uma senha inicial
                que deverá ser trocada no primeiro acesso.
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
              <section className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[#dfe6e7] bg-[var(--surface-soft)] px-5 py-4 text-[11px] text-[#687780]">
                <span className="grid size-7 flex-none place-items-center rounded-full bg-[var(--surface)] text-[var(--aqua)]">
                  <Icon name="settings" size={15} />
                </span>
                Modo demonstração: os usuários criados aqui ficam salvos somente
                neste navegador até o Supabase ser configurado.
              </section>
            )}

            <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(270px,0.8fr)] gap-[var(--cards-gap)] max-[860px]:grid-cols-1">
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
                      className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[#90a7af]"
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
                      className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[#90a7af]"
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
                        className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none focus:border-[#90a7af] disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none focus:border-[#90a7af]"
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
                  <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7f8991] uppercase">
                    Senha inicial
                    <div className="flex gap-2">
                      <input
                        className="h-12 min-w-0 flex-1 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[#90a7af]"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mínimo de 12 caracteres"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={12}
                        required
                      />
                      <button
                        className="h-12 rounded-[14px] border border-[#e1e5e6] px-3 text-[10px] font-bold tracking-normal text-[#6e7c84] normal-case transition-colors hover:border-[#a9b7bc]"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                    <span className="font-normal tracking-normal text-[#a0a8ad] normal-case">
                      Use letras maiúsculas, minúsculas, números e símbolos.
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
                    {submitting ? "Criando…" : "Criar usuário"}
                    <Icon name="arrow" size={15} />
                  </button>
                  <button
                    className="text-left text-[11px] font-bold text-[var(--aqua)] underline decoration-[#c9d4d7] underline-offset-4 hover:text-[var(--ink)]"
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                  >
                    Gerar senha segura
                  </button>
                </div>
              </form>

              <aside className="surface-card rounded-[var(--radius-card)] bg-[var(--ink)] p-6 text-white max-[720px]:rounded-[23px]">
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#a6b1b5] uppercase">
                  POLÍTICA DE ACESSO
                </p>
                <h2 className="m-0 max-w-[240px] text-[25px] leading-[1.02] font-bold tracking-[-0.06em]">
                  Um começo seguro para cada pessoa.
                </h2>
                <div className="mt-8 grid gap-4">
                  {[
                    "Sem cadastro público",
                    "E-mail confirmado pelo administrador",
                    "Troca da senha no primeiro acesso",
                  ].map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full border border-[#819198] text-[#d9e2e2]">
                        <Icon name="check" size={12} />
                      </span>
                      <span className="text-[11px] leading-relaxed text-[#c0cbcd]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-white/15 pt-4 text-[10px] leading-relaxed text-[#8f9da1]">
                  Compartilhe a senha inicial por um canal seguro. Ela não é
                  enviada automaticamente por este painel.
                </div>
              </aside>
            </section>

            <section className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
              <div className="flex items-start justify-between gap-6 max-[620px]:flex-col">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    CONVITE DE WORKSPACE
                  </p>
                  <h2 className="m-0 text-[22px] font-bold tracking-[-0.05em]">
                    Chamar usuário para este ambiente
                  </h2>
                  <p className="mt-2 mb-0 max-w-[650px] text-[11px] leading-relaxed text-[#87919a]">
                    Libere uma conta já cadastrada em um workspace e envie uma
                    notificação para ela. Nenhum e-mail externo é enviado por
                    este painel.
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
                    className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none placeholder:text-[#aab1b5] focus:border-[#90a7af]"
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
                    className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none focus:border-[#90a7af] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="h-12 rounded-[14px] border border-[#e1e5e6] bg-[var(--surface-soft)] px-4 text-[13px] font-normal tracking-normal text-[var(--ink)] normal-case transition-colors outline-none focus:border-[#90a7af]"
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

            <section className="surface-card overflow-hidden rounded-[var(--radius-card)] max-[720px]:rounded-[23px]">
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
                  className="inline-flex items-center gap-2 rounded-[11px] border border-[#e1e5e6] px-3 py-2 text-[10px] font-bold text-[#6e7c84] transition-colors hover:border-[#a9b7bc]"
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
                  <table className="w-full min-w-[980px] border-collapse text-left">
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
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((managedUser) => (
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
                                      className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-bold text-[#687780]"
                                      key={`${managedUser.id}-${membership.workspaceId}-role`}
                                    >
                                      {roleLabel(membership.role)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
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
