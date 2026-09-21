"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  connectedWorkspace,
  WorkspaceManagePanel,
  type WorkspaceSummary,
} from "@/components/workspace/workspace-switcher";
import { Icon } from "@/components/ui/icon";
import {
  readActiveWorkspaceId,
  readLocalWorkspaces,
  type WorkspaceEnvironment,
  writeActiveWorkspaceId,
  writeLocalWorkspaces,
} from "@/lib/company-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type WorkspaceDraft = {
  name: string;
  environment: WorkspaceEnvironment;
  description: string;
};

const emptyWorkspace: WorkspaceDraft = {
  name: "",
  environment: "test",
  description: "",
};

function isGlobalAdmin(user: ReturnType<typeof useAuth>["user"]) {
  if (!isSupabaseConfigured) return true;
  if (user?.email?.toLowerCase() === "admin@teste.com") return true;
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

function environmentLabel(environment: WorkspaceEnvironment) {
  return environment === "production" ? "Produção" : "Teste";
}

function localWorkspaceSummary(
  workspace: ReturnType<typeof readLocalWorkspaces>[number],
): WorkspaceSummary {
  return {
    description: workspace.description,
    environment: workspace.environment,
    id: workspace.id,
    initial: workspace.name.slice(0, 1).toUpperCase(),
    name: workspace.name,
  };
}

function CreateWorkspaceCard({
  draft,
  error,
  creating,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: WorkspaceDraft;
  error: string | null;
  creating: boolean;
  onChange: (draft: WorkspaceDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="workspace-page-create-card" onSubmit={onSubmit}>
      <div className="workspace-page-create-heading">
        <div>
          <span className="workspace-page-eyebrow">NOVO AMBIENTE</span>
          <h2>Criar workspace</h2>
          <p>Separe testes e produção sem criar ambientes na API BeePhish.</p>
        </div>
        <button
          className="workspace-page-icon-button"
          type="button"
          aria-label="Fechar criação de workspace"
          onClick={onCancel}
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      <div className="workspace-page-create-fields">
        <label className="workspace-field">
          <span>Nome do workspace</span>
          <input
            autoFocus
            maxLength={80}
            required
            placeholder="Ex.: Laboratório"
            value={draft.name}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
          />
        </label>
        <fieldset className="workspace-fieldset">
          <legend>Ambiente</legend>
          <div className="workspace-environment-options">
            {(["test", "production"] as WorkspaceEnvironment[]).map(
              (environment) => (
                <label
                  className={
                    draft.environment === environment ? "is-selected" : ""
                  }
                  key={environment}
                >
                  <input
                    checked={draft.environment === environment}
                    name="workspace-page-environment"
                    type="radio"
                    value={environment}
                    onChange={() => onChange({ ...draft, environment })}
                  />
                  <span>
                    <strong>{environmentLabel(environment)}</strong>
                    <small>
                      {environment === "production"
                        ? "Dados oficiais"
                        : "Testes e validações"}
                    </small>
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>
        <label className="workspace-field">
          <span>
            Descrição <small>(opcional)</small>
          </span>
          <textarea
            maxLength={240}
            rows={3}
            placeholder="Descreva o uso deste ambiente"
            value={draft.description}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
          />
        </label>
      </div>
      {error && (
        <p className="workspace-create-error" role="alert">
          {error}
        </p>
      )}
      <div className="workspace-page-create-actions">
        <button
          className="workspace-modal-secondary"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="workspace-modal-primary"
          disabled={creating}
          type="submit"
        >
          {creating ? "Criando…" : "Criar workspace"}
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </form>
  );
}

function WorkspacePageContent() {
  const { ready, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] =
    useState<WorkspaceDraft>(emptyWorkspace);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreateWorkspace = isGlobalAdmin(user);
  const selectedWorkspace = selectedWorkspaceId
    ? (workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
      null)
    : null;

  async function getAccessToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  function mapWorkspaces(items: WorkspaceSummary[], useFallback = false) {
    const next = items.length || !useFallback ? items : [connectedWorkspace];
    setWorkspaces(next);
    const stored = readActiveWorkspaceId();
    const nextActiveWorkspaceId =
      next.find((workspace) => workspace.id === stored)?.id ??
      next[0]?.id ??
      "";
    setActiveWorkspaceId(nextActiveWorkspaceId);
    if (nextActiveWorkspaceId && nextActiveWorkspaceId !== stored) {
      writeActiveWorkspaceId(nextActiveWorkspaceId);
    }
    setSelectedWorkspaceId((current) =>
      current && next.some((workspace) => workspace.id === current)
        ? current
        : (next[0]?.id ?? null),
    );
  }

  async function syncWorkspaces() {
    const local = readLocalWorkspaces().map(localWorkspaceSummary);
    if (!isSupabaseConfigured) {
      mapWorkspaces(local, true);
      return;
    }
    if (!ready || !user || !supabase) return;
    const accessToken = await getAccessToken();
    if (!accessToken) return;
    const response = await fetch("/api/workspaces", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      workspaces?: Array<{
        description?: string;
        environment?: WorkspaceEnvironment;
        id: string;
        name: string;
        role?: WorkspaceSummary["role"];
      }>;
    };
    if (!response.ok) return;
    mapWorkspaces(
      (body.workspaces ?? []).map((workspace) => ({
        description: workspace.description ?? "",
        environment:
          workspace.environment === "production" ? "production" : "test",
        id: workspace.id,
        initial: workspace.name.slice(0, 1).toUpperCase(),
        name: workspace.name,
        role: workspace.role,
      })),
    );
  }

  useEffect(() => {
    void syncWorkspaces();
    window.addEventListener("pierphish:workspaces-changed", syncWorkspaces);
    window.addEventListener("pierphish:workspace-selected", syncWorkspaces);
    return () => {
      window.removeEventListener(
        "pierphish:workspaces-changed",
        syncWorkspaces,
      );
      window.removeEventListener(
        "pierphish:workspace-selected",
        syncWorkspaces,
      );
    };
    // The page owns the current workspace list and auth readiness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  function selectWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
    setSelectedWorkspaceId(workspaceId);
    writeActiveWorkspaceId(workspaceId);
  }

  function createLocalWorkspace(name: string) {
    const workspace = {
      id: `workspace-${Date.now()}`,
      name,
      environment: workspaceDraft.environment,
      description: workspaceDraft.description.trim(),
      logoUrl: null,
      createdAt: new Date().toISOString(),
      role: "owner" as const,
    };
    const stored = [...readLocalWorkspaces(), workspace];
    writeLocalWorkspaces(stored);
    setWorkspaces(stored.map(localWorkspaceSummary));
    selectWorkspace(workspace.id);
    setCreateOpen(false);
    setWorkspaceDraft(emptyWorkspace);
    setCreating(false);
  }

  async function submitWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    const name = workspaceDraft.name.trim();
    if (name.length < 2) {
      setCreateError("Informe um nome com pelo menos 2 caracteres.");
      setCreating(false);
      return;
    }
    if (!isSupabaseConfigured) {
      createLocalWorkspace(name);
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCreateError("Sua sessão expirou. Entre novamente para criar.");
      setCreating(false);
      return;
    }
    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "workspace",
        name,
        environment: workspaceDraft.environment,
        description: workspaceDraft.description.trim(),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      workspace?: WorkspaceSummary;
      error?: string;
    };
    if (response.status === 503) {
      createLocalWorkspace(name);
      return;
    }
    if (!response.ok || !body.workspace) {
      setCreateError(body.error ?? "Não foi possível criar o workspace.");
      setCreating(false);
      return;
    }
    const workspace = {
      ...body.workspace,
      initial: body.workspace.name.slice(0, 1).toUpperCase(),
    };
    setWorkspaces((current) => [...current, workspace]);
    selectWorkspace(workspace.id);
    setCreateOpen(false);
    setWorkspaceDraft(emptyWorkspace);
    setCreating(false);
  }

  if (!ready || (isSupabaseConfigured && !user)) {
    return <div className="workspace-page-loading">Carregando workspaces…</div>;
  }

  return (
    <DashboardShell activeSection="workspaces" title="Workspaces">
      <div className="workspace-page">
        <header className="workspace-page-intro">
          <div>
            <span className="workspace-page-eyebrow">
              AMBIENTES DE OPERAÇÃO
            </span>
            <h1>Um espaço para cada contexto.</h1>
            <p>
              Separe testes e produção, escolha o ambiente ativo e controle quem
              participa de cada operação.
            </p>
          </div>
          <div className="workspace-page-intro-actions">
            <span>
              {workspaces.length}{" "}
              {workspaces.length === 1 ? "workspace" : "workspaces"}
            </span>
            {canCreateWorkspace && (
              <button
                className="workspace-page-primary"
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setWorkspaceDraft(emptyWorkspace);
                  setCreateOpen(true);
                }}
              >
                <Icon name="plus" size={15} />
                Novo workspace
              </button>
            )}
          </div>
        </header>

        {createOpen && (
          <CreateWorkspaceCard
            creating={creating}
            draft={workspaceDraft}
            error={createError}
            onCancel={() => {
              if (!creating) setCreateOpen(false);
            }}
            onChange={setWorkspaceDraft}
            onSubmit={(event) => void submitWorkspace(event)}
          />
        )}

        <div className="workspace-page-grid">
          <section
            className="workspace-page-list surface-card"
            aria-label="Lista de workspaces"
          >
            <div className="workspace-page-section-heading">
              <div>
                <span className="workspace-page-eyebrow">SEUS AMBIENTES</span>
                <h2>Workspaces</h2>
              </div>
              <Icon name="layers" size={20} />
            </div>
            <div className="workspace-page-options">
              {workspaces.map((workspace) => (
                <button
                  className={`workspace-page-option ${workspace.id === selectedWorkspaceId ? "is-selected" : ""}`}
                  key={workspace.id}
                  type="button"
                  onClick={() => selectWorkspace(workspace.id)}
                  aria-pressed={workspace.id === selectedWorkspaceId}
                >
                  <span className="workspace-page-option-avatar">
                    {workspace.initial}
                  </span>
                  <span className="workspace-page-option-copy">
                    <strong>{workspace.name}</strong>
                    <small>
                      {workspace.description ||
                        environmentLabel(workspace.environment)}
                    </small>
                  </span>
                  <span
                    className={`workspace-page-option-state ${workspace.environment}`}
                  >
                    <i />
                    {workspace.id === activeWorkspaceId
                      ? "Ativo"
                      : environmentLabel(workspace.environment)}
                  </span>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
              {!workspaces.length && (
                <div className="workspace-page-empty">
                  <Icon name="layers" size={18} />
                  <strong>Nenhum workspace atribuído</strong>
                  <span>
                    Peça a um administrador para adicionar seu usuário.
                  </span>
                </div>
              )}
            </div>
          </section>

          {selectedWorkspace ? (
            <section className="workspace-page-manage surface-card">
              <WorkspaceManagePanel
                globalAdmin={canCreateWorkspace}
                onBack={() => setSelectedWorkspaceId(null)}
                onClose={() => undefined}
                onUpdated={(nextWorkspace) => {
                  setWorkspaces((current) =>
                    current.map((workspace) =>
                      workspace.id === nextWorkspace.id
                        ? { ...workspace, ...nextWorkspace }
                        : workspace,
                    ),
                  );
                }}
                variant="page"
                workspace={selectedWorkspace}
              />
            </section>
          ) : (
            <section className="workspace-page-empty-panel surface-card">
              <Icon name="layers" size={22} />
              <h2>Escolha um workspace</h2>
              <p>
                Selecione um ambiente para personalizar seus dados e administrar
                as pessoas.
              </p>
            </section>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

export function WorkspaceManagementPage() {
  return (
    <AuthGuard>
      <WorkspacePageContent />
    </AuthGuard>
  );
}
