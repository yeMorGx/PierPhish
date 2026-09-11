"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Icon } from "@/components/ui/icon";

export type PersonRiskLevel = "high" | "attention" | "low";

export type PersonDetails = {
  avatar?: string | null;
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  campaigns: Array<{ id: number; name: string }>;
  opened: boolean;
  clicked: boolean;
  reported: boolean;
  submitted: boolean;
  lastActivity: string | null;
  sentAt: string | null;
  risk: PersonRiskLevel;
  score: number;
  events: Array<{
    id: string;
    label: string;
    occurredAt: string | null;
  }>;
};

const riskLabels: Record<PersonRiskLevel, string> = {
  high: "Risco alto",
  attention: "Atenção",
  low: "Risco baixo",
};

const riskDescriptions: Record<PersonRiskLevel, string> = {
  high: "Clicou ou enviou dados",
  attention: "Abriu a mensagem",
  low: "Sem exposição crítica",
};

const signalItems = [
  { key: "opened", label: "Abriu", helper: "Visualizou a mensagem" },
  { key: "clicked", label: "Clicou", helper: "Acessou um link" },
  { key: "reported", label: "Reportou", helper: "Sinalizou a mensagem" },
  { key: "submitted", label: "Dados enviados", helper: "Enviou informações" },
] as const;

const maxAvatarSize = 1.5 * 1024 * 1024;
const supportedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

function formatDateTime(value: string | null) {
  if (!value) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PersonDetailsModal({
  person,
  onClose,
  onAvatarChange,
}: {
  person: PersonDetails | null;
  onClose: () => void;
  onAvatarChange?: (personId: string, avatar: string) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    setAvatarPreview(person?.avatar ?? null);
    setAvatarError(null);
  }, [person?.avatar, person?.id]);

  useEffect(() => {
    if (!person) return;

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, person]);

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !person) return;
    if (!supportedAvatarTypes.includes(file.type)) {
      setAvatarError("Escolha uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > maxAvatarSize) {
      setAvatarError("Escolha uma foto de até 1,5 MB.");
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAvatarPreview(reader.result);
      onAvatarChange?.(person.id, reader.result);
    };
    reader.readAsDataURL(file);
  }

  if (!person) return null;

  return (
    <div
      className="person-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="person-details-title"
        aria-modal="true"
        className="person-modal"
        role="dialog"
      >
        <header className="person-modal-header">
          <div className="person-modal-heading">
            <label
              className="person-modal-avatar-upload"
              title="Trocar foto de perfil"
            >
              <PersonAvatar
                avatar={avatarPreview ?? person.avatar}
                name={person.name}
                size="lg"
              />
              <span className="person-modal-avatar-overlay" aria-hidden="true">
                <Icon name="image" size={14} />
                <span>Trocar</span>
              </span>
              <span className="person-modal-avatar-edit" aria-hidden="true">
                <Icon name="image" size={12} />
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label={`Trocar foto de ${person.name}`}
                onChange={handleAvatar}
              />
            </label>
            <div className="min-w-0">
              <p className="person-modal-eyebrow">DETALHES DA PESSOA</p>
              <h2 id="person-details-title">{person.name}</h2>
              <p>{person.email}</p>
            </div>
          </div>
          <div className="person-modal-actions">
            <span className={`person-risk-badge is-${person.risk}`}>
              <span aria-hidden="true" />
              {riskLabels[person.risk]}
            </span>
            <button
              ref={closeButtonRef}
              aria-label={`Fechar detalhes de ${person.name}`}
              className="person-modal-close"
              onClick={onClose}
              type="button"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        <div className="person-modal-body">
          {avatarError && (
            <p className="person-avatar-error" role="alert">
              {avatarError}
            </p>
          )}
          <section className="person-modal-score" aria-label="Resumo do risco">
            <div>
              <span className="person-modal-label">LEITURA DE RISCO</span>
              <strong>
                {person.score}
                <small>/4</small>
              </strong>
              <p>{riskDescriptions[person.risk]}</p>
            </div>
            <div
              className={`person-score-orb is-${person.risk}`}
              aria-hidden="true"
            >
              <span>{person.score}</span>
            </div>
          </section>

          <section className="person-modal-section">
            <div className="person-modal-section-heading">
              <div>
                <span className="person-modal-label">SINAIS REGISTRADOS</span>
                <h3>Comportamento observado</h3>
              </div>
              <span className="person-modal-muted">
                Última atividade: {formatDateTime(person.lastActivity)}
              </span>
            </div>
            <div className="person-signal-grid">
              {signalItems.map((signal) => {
                const active = person[signal.key];
                return (
                  <div
                    className={`person-signal-card ${active ? "is-active" : ""}`}
                    key={signal.key}
                  >
                    <span className="person-signal-dot" aria-hidden="true" />
                    <div>
                      <strong>{signal.label}</strong>
                      <small>{active ? signal.helper : "Sem registro"}</small>
                    </div>
                    <span className="person-signal-state">
                      {active ? "Sim" : "Não"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="person-modal-section">
            <span className="person-modal-label">DADOS DA PESSOA</span>
            <div className="person-info-grid">
              <div>
                <span>Área</span>
                <strong>{person.department}</strong>
              </div>
              <div>
                <span>Cargo</span>
                <strong>{person.position}</strong>
              </div>
              <div>
                <span>Status atual</span>
                <strong>{person.status}</strong>
              </div>
              <div>
                <span>Envio da campanha</span>
                <strong>{formatDateTime(person.sentAt)}</strong>
              </div>
            </div>
          </section>

          <section className="person-modal-columns">
            <div className="person-modal-section person-modal-subsection">
              <div className="person-modal-section-heading">
                <div>
                  <span className="person-modal-label">CAMPANHAS</span>
                  <h3>Participação</h3>
                </div>
                <span className="person-modal-count">
                  {person.campaigns.length}
                </span>
              </div>
              <div className="person-campaign-list">
                {person.campaigns.map((campaign) => (
                  <Link href={`/campaigns/${campaign.id}`} key={campaign.id}>
                    <span>{campaign.name}</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                ))}
                {!person.campaigns.length && (
                  <span className="person-modal-muted">
                    Sem campanha vinculada.
                  </span>
                )}
              </div>
            </div>

            <div className="person-modal-section person-modal-subsection">
              <div className="person-modal-section-heading">
                <div>
                  <span className="person-modal-label">LINHA DO TEMPO</span>
                  <h3>Atividade recente</h3>
                </div>
                <span className="person-modal-count">
                  {person.events.length}
                </span>
              </div>
              <div className="person-timeline">
                {person.events.slice(0, 6).map((event) => (
                  <div className="person-timeline-item" key={event.id}>
                    <span className="person-timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{event.label}</strong>
                      <time>{formatDateTime(event.occurredAt)}</time>
                    </div>
                  </div>
                ))}
                {!person.events.length && (
                  <span className="person-modal-muted">
                    Nenhum evento detalhado.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="person-modal-footer">
          <span>Dados sincronizados da BeePhish</span>
          <button onClick={onClose} type="button">
            Fechar detalhes
          </button>
        </footer>
      </section>
    </div>
  );
}
