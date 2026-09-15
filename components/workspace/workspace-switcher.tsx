"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import {
  readActiveWorkspaceId,
  readLocalWorkspaces,
  type WorkspaceEnvironment,
  writeActiveWorkspaceId,
} from "@/lib/company-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type WorkspaceSummary = {
  description: string;
  environment: WorkspaceEnvironment;
  id: string;
  initial: string;
  name: string;
};

export const connectedWorkspace: WorkspaceSummary = {
  id: "primary",
  initial: "P",
  name: "Workspace principal",
  description: "Dados atuais do PierPhish",
  environment: "production",
};

type WorkspaceSwitcherProps = {
  onClose: () => void;
  open: boolean;
};

export function WorkspaceSwitcher({ onClose, open }: WorkspaceSwitcherProps) {
  const { ready, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([
    connectedWorkspace,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    connectedWorkspace.id,
  );

  useEffect(() => {
    const mapWorkspaces = (items: WorkspaceSummary[]) => {
      setWorkspaces(items.length ? items : [connectedWorkspace]);
      setActiveWorkspaceId((current) => {
        const stored = readActiveWorkspaceId();
        if (items.some((workspace) => workspace.id === stored)) return stored;
        if (items.some((workspace) => workspace.id === current)) return current;
        return items[0]?.id ?? connectedWorkspace.id;
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
      mapWorkspaces(local);

      if (!isSupabaseConfigured || !ready || !user || !supabase) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      const response = await fetch("/api/admin/companies", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return;
      const body = (await response.json().catch(() => ({}))) as {
        workspaces?: Array<{
          description?: string;
          environment?: WorkspaceEnvironment;
          id: string;
          name: string;
        }>;
      };
      mapWorkspaces(
        (body.workspaces ?? []).map((workspace) => ({
          description: workspace.description ?? "",
          environment:
            workspace.environment === "production" ? "production" : "test",
          id: workspace.id,
          initial: workspace.name.slice(0, 1).toUpperCase(),
          name: workspace.name,
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
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-label="Trocar workspace"
      className="workspace-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="workspace-modal-title"
        aria-modal="true"
        className="workspace-modal"
        role="dialog"
      >
        <header className="workspace-modal-header">
          <div>
            <p className="workspace-modal-eyebrow">AMBIENTES CONECTADOS</p>
            <h2 id="workspace-modal-title">Trocar workspace</h2>
            <p>Escolha de qual ambiente o PierPhish deve carregar os dados.</p>
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
                </small>
              </span>
              <span className="workspace-option-status">
                <i />
                {workspace.id === activeWorkspaceId
                  ? "Ativo"
                  : workspace.environment === "production"
                    ? "Produção"
                    : "Teste"}
              </span>
              {workspace.id === activeWorkspaceId && (
                <Icon name="check" size={16} />
              )}
            </button>
          ))}

          {workspaces.length === 1 && (
            <div className="workspace-empty-state">
              <span className="workspace-empty-icon">
                <Icon name="grid" size={19} />
              </span>
              <div>
                <strong>Crie outro ambiente em Empresas</strong>
                <p>
                  Adicione workspaces de teste ou produção sem usar a API do
                  BeePhish.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="workspace-modal-footer">
          <span>O workspace ativo define os dados exibidos no painel.</span>
          <button onClick={onClose} type="button">
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}
