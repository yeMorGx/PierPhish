"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import {
  readActiveWorkspaceId,
  readLocalWorkspaces,
  type WorkspaceEnvironment,
  type WorkspaceRole,
  writeActiveWorkspaceId,
  writeLocalWorkspaces,
} from "@/lib/company-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type WorkspaceSummary = {
  description: string;
  environment: WorkspaceEnvironment;
  id: string;
  initial: string;
  name: string;
  role?: WorkspaceRole;
};

export const connectedWorkspace: WorkspaceSummary = {
  id: "primary",
  initial: "P",
  name: "Workspace principal",
  description: "Dados atuais do PierPhish",
  environment: "production",
  role: "owner",
};

type WorkspaceSwitcherProps = {
  onClose: () => void;
  open: boolean;
};

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

function isAdminUser(user: ReturnType<typeof useAuth>["user"]) {
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

function roleLabel(role?: WorkspaceRole) {
  if (role === "owner") return "Proprietário";
  if (role === "admin") return "Administrador";
  if (role === "analyst") return "Analista";
  return "Visualizador";
}

export function WorkspaceSwitcher({ onClose, open }: WorkspaceSwitcherProps) {
  const { ready, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([
    connectedWorkspace,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    connectedWorkspace.id,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] =
    useState<WorkspaceDraft>(emptyWorkspace);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreateWorkspace = isAdminUser(user);

  function closeCreate(force = false) {
    if (creating && !force) return;
    setCreateOpen(false);
    setCreateError(null);
    setWorkspaceDraft(emptyWorkspace);
  }

  function createLocalWorkspace(name: string) {
    const localWorkspace = {
      id: `workspace-${Date.now()}`,
      name,
      environment: workspaceDraft.environment,
      description: workspaceDraft.description.trim(),
      logoUrl: null,
      createdAt: new Date().toISOString(),
      role: "owner" as const,
    };
    const storedWorkspaces = [...readLocalWorkspaces(), localWorkspace];
    setWorkspaces(
      storedWorkspaces.map((item) => ({
        id: item.id,
        name: item.name,
        environment: item.environment,
        description: item.description,
        initial: item.name.slice(0, 1).toUpperCase(),
      })),
    );
    writeLocalWorkspaces(storedWorkspaces);
    writeActiveWorkspaceId(localWorkspace.id);
    setActiveWorkspaceId(localWorkspace.id);
    closeCreate(true);
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

    if (!supabase) {
      setCreateError("O Supabase não está disponível nesta sessão.");
      setCreating(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
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
    setActiveWorkspaceId(workspace.id);
    writeActiveWorkspaceId(workspace.id);
    closeCreate(true);
    setCreating(false);
  }

  useEffect(() => {
    const mapWorkspaces = (items: WorkspaceSummary[], useFallback = false) => {
      setWorkspaces(
        items.length || !useFallback ? items : [connectedWorkspace],
      );
      setActiveWorkspaceId((current) => {
        const stored = readActiveWorkspaceId();
        if (items.some((workspace) => workspace.id === stored)) return stored;
        if (items.some((workspace) => workspace.id === current)) return current;
        return items[0]?.id ?? (useFallback ? connectedWorkspace.id : "");
      });
    };

    const syncWorkspaces = async () => {
      const local = readLocalWorkspaces().map((workspace) => ({
        description: workspace.description,
        environment: workspace.environment,
        id: workspace.id,
        initial: workspace.name.slice(0, 1).toUpperCase(),
        name: workspace.name,
      }));
      if (!isSupabaseConfigured) {
        mapWorkspaces(local, true);
        return;
      }
      if (!ready || !user || !supabase) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
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
          role?: WorkspaceRole;
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
    };

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
  }, [ready, user]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (createOpen) closeCreate();
      else onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [createOpen, onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-label="Trocar workspace"
      className="workspace-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (createOpen) closeCreate();
        onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="workspace-modal-title"
        aria-modal="true"
        className="workspace-modal"
        role="dialog"
      >
        {createOpen ? (
          <>
            <header className="workspace-modal-header">
              <div>
                <button
                  className="workspace-modal-back"
                  onClick={() => closeCreate()}
                  type="button"
                >
                  <Icon name="arrow" size={15} />
                  Workspaces
                </button>
                <p className="workspace-modal-eyebrow">NOVO WORKSPACE</p>
                <h2 id="workspace-modal-title">Criar ambiente</h2>
                <p>
                  Separe testes e produção sem criar um workspace na API do
                  BeePhish.
                </p>
              </div>
              <button
                aria-label="Fechar criação de workspace"
                className="workspace-modal-close"
                onClick={() => {
                  closeCreate();
                  onClose();
                }}
                type="button"
              >
                <Icon name="close" size={17} />
              </button>
            </header>

            <form
              className="workspace-create-form"
              onSubmit={(event) => void submitWorkspace(event)}
            >
              <div className="workspace-modal-body">
                <label className="workspace-field">
                  <span>Nome do workspace</span>
                  <input
                    autoFocus
                    maxLength={80}
                    onChange={(event) =>
                      setWorkspaceDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex.: Laboratório"
                    required
                    value={workspaceDraft.name}
                  />
                </label>

                <fieldset className="workspace-fieldset">
                  <legend>Ambiente</legend>
                  <div className="workspace-environment-options">
                    {(["test", "production"] as WorkspaceEnvironment[]).map(
                      (environment) => (
                        <label
                          className={
                            workspaceDraft.environment === environment
                              ? "is-selected"
                              : ""
                          }
                          key={environment}
                        >
                          <input
                            checked={workspaceDraft.environment === environment}
                            name="workspace-environment"
                            onChange={() =>
                              setWorkspaceDraft((current) => ({
                                ...current,
                                environment,
                              }))
                            }
                            type="radio"
                            value={environment}
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
                    Informações <small>(opcional)</small>
                  </span>
                  <textarea
                    maxLength={240}
                    onChange={(event) =>
                      setWorkspaceDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Descreva o uso deste ambiente"
                    rows={3}
                    value={workspaceDraft.description}
                  />
                </label>

                {createError && (
                  <p className="workspace-create-error" role="alert">
                    {createError}
                  </p>
                )}
              </div>
              <footer className="workspace-modal-footer">
                <button
                  className="workspace-modal-secondary"
                  onClick={() => closeCreate()}
                  type="button"
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
              </footer>
            </form>
          </>
        ) : (
          <>
            <header className="workspace-modal-header">
              <div>
                <p className="workspace-modal-eyebrow">AMBIENTES CONECTADOS</p>
                <h2 id="workspace-modal-title">Trocar workspace</h2>
                <p>
                  Escolha de qual ambiente o PierPhish deve carregar os dados.
                </p>
              </div>
              <button
                aria-label="Fechar troca de workspace"
                className="workspace-modal-close"
                onClick={onClose}
                type="button"
              >
                <Icon name="close" size={17} />
              </button>
            </header>

            <div className="workspace-modal-body">
              {workspaces.map((workspace) => (
                <button
                  aria-pressed={workspace.id === activeWorkspaceId}
                  className={`workspace-option ${workspace.id === activeWorkspaceId ? "is-current" : ""}`}
                  key={workspace.id}
                  onClick={() => {
                    setActiveWorkspaceId(workspace.id);
                    writeActiveWorkspaceId(workspace.id);
                    onClose();
                  }}
                  type="button"
                >
                  <span className="workspace-option-avatar">
                    {workspace.initial}
                  </span>
                  <span className="workspace-option-copy">
                    <strong>{workspace.name}</strong>
                    <small>
                      {workspace.description ||
                        (workspace.environment === "production"
                          ? "Ambiente de produção"
                          : "Ambiente de teste")}
                      {" · "}
                      {roleLabel(workspace.role)}
                    </small>
                  </span>
                  <span className="workspace-option-status">
                    <i />
                    {workspace.id === activeWorkspaceId
                      ? "Ativo"
                      : environmentLabel(workspace.environment)}
                  </span>
                  {workspace.id === activeWorkspaceId && (
                    <Icon name="check" size={16} />
                  )}
                </button>
              ))}

              {workspaces.length === 0 && !canCreateWorkspace && (
                <div className="workspace-empty-state">
                  <span className="workspace-empty-icon">
                    <Icon name="grid" size={19} />
                  </span>
                  <div>
                    <strong>Nenhum workspace atribuído</strong>
                    <p>
                      Peça a um administrador para adicionar seu usuário a um
                      workspace.
                    </p>
                  </div>
                </div>
              )}

              {workspaces.length === 1 && (
                <div className="workspace-empty-state">
                  <span className="workspace-empty-icon">
                    <Icon name="grid" size={19} />
                  </span>
                  <div>
                    <strong>Este é o seu primeiro ambiente</strong>
                    <p>
                      Crie outro workspace de teste ou produção quando quiser
                      separar as operações.
                    </p>
                  </div>
                </div>
              )}

              {canCreateWorkspace && (
                <button
                  className="workspace-create-button"
                  onClick={() => {
                    setCreateError(null);
                    setWorkspaceDraft(emptyWorkspace);
                    setCreateOpen(true);
                  }}
                  type="button"
                >
                  <span>
                    <Icon name="plus" size={16} />
                  </span>
                  <strong>Criar workspace</strong>
                  <small>Adicionar ambiente de teste ou produção</small>
                  <Icon name="arrow" size={15} />
                </button>
              )}
            </div>

            <footer className="workspace-modal-footer">
              <span>O workspace ativo define o ambiente do painel.</span>
              <button onClick={onClose} type="button">
                Fechar
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
