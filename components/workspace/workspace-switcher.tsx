"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";

export type WorkspaceSummary = {
  description: string;
  id: string;
  initial: string;
  name: string;
};

export const connectedWorkspace: WorkspaceSummary = {
  id: "primary",
  initial: "P",
  name: "Workspace principal",
  description: "Dados atuais do PierPhish",
};

type WorkspaceSwitcherProps = {
  onClose: () => void;
  open: boolean;
};

export function WorkspaceSwitcher({ onClose, open }: WorkspaceSwitcherProps) {
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
          <button
            aria-pressed="true"
            className="workspace-option is-current"
            onClick={onClose}
            type="button"
          >
            <span className="workspace-option-avatar">
              {connectedWorkspace.initial}
            </span>
            <span className="workspace-option-copy">
              <strong>{connectedWorkspace.name}</strong>
              <small>{connectedWorkspace.description}</small>
            </span>
            <span className="workspace-option-status">
              <i />
              Ativo
            </span>
            <Icon name="check" size={16} />
          </button>

          <div className="workspace-empty-state">
            <span className="workspace-empty-icon">
              <Icon name="grid" size={19} />
            </span>
            <div>
              <strong>Nenhum outro workspace conectado</strong>
              <p>
                Quando você adicionar outro ambiente pela API, ele aparecerá
                aqui para troca rápida.
              </p>
            </div>
          </div>
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
