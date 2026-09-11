"use client";

import Link from "next/link";
import { CampaignLogoPicker } from "@/components/campaigns/campaign-logo";
import { PersonAvatar } from "@/components/people/person-avatar";
import type { PersonDetails } from "@/components/people/person-details-modal";
import { Icon } from "@/components/ui/icon";

type CampaignFilter = "all" | "opened" | "clicked" | "reported";

type VisualCampaignContentProps = {
  campaign: {
    id: number;
    name: string;
    status: string | null;
    synced_at: string | null;
    stats: {
      delivered?: number;
    };
  };
  events: Array<{
    beephish_event_id: string;
    event_type: string | null;
    email: string | null;
    occurred_at: string | null;
  }>;
  filter: CampaignFilter;
  onFilterChange: (value: CampaignFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectPerson: (person: PersonDetails) => void;
  people: PersonDetails[];
  search: string;
  summary: {
    total: number;
    opened: number;
    clicked: number;
    reported: number;
  };
  visiblePeople: PersonDetails[];
};

const filterItems: Array<[CampaignFilter, string]> = [
  ["all", "Todos"],
  ["opened", "Abriram"],
  ["clicked", "Clicaram"],
  ["reported", "Reportaram"],
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function signalLabel(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("click") || normalized.includes("link"))
    return "Clicou";
  if (normalized.includes("report")) return "Reportou";
  if (normalized.includes("open")) return "Abriu";
  if (normalized.includes("deliver")) return "Entregue";
  return value || "Evento";
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function SignalDots({ person }: { person: PersonDetails }) {
  const signals = [
    person.opened,
    person.clicked,
    person.reported,
    person.submitted,
  ];

  return (
    <span
      className="visual-campaign-signal-dots"
      aria-label="Sinais observados"
    >
      {signals.map((active, index) => (
        <i className={active ? `is-active signal-${index}` : ""} key={index} />
      ))}
    </span>
  );
}

function Ring({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="visual-campaign-ring" aria-label={`${value}% de abertura`}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle className="visual-campaign-ring-track" cx="52" cy="52" r="44" />
        <circle
          className="visual-campaign-ring-value"
          cx="52"
          cy="52"
          r="44"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <strong>{value}%</strong>
      <span>abertura</span>
    </div>
  );
}

export function VisualCampaignContent({
  campaign,
  events,
  filter,
  onFilterChange,
  onSearchChange,
  onSelectPerson,
  people,
  search,
  summary,
  visiblePeople,
}: VisualCampaignContentProps) {
  const openingRate = percent(summary.opened, summary.total);
  const delivered = campaign.stats?.delivered ?? summary.total;

  return (
    <div className="visual-campaign-dashboard">
      <section className="surface-card visual-campaign-hero">
        <div className="visual-campaign-hero-main">
          <Link className="visual-campaign-back" href="/">
            <Icon name="arrow" size={15} />
            Visão geral
          </Link>
          <div className="visual-campaign-title-row">
            <CampaignLogoPicker
              campaignId={campaign.id}
              fallback={campaign.name.charAt(0).toUpperCase()}
            />
            <div className="visual-campaign-title-copy">
              <span className="visual-dashboard-overline">
                Campanha / {campaign.id}
              </span>
              <h1>{campaign.name}</h1>
              <div className="visual-campaign-status-row">
                <i />
                <span>
                  {campaign.status === "Completed"
                    ? "Concluída"
                    : "Em andamento"}
                </span>
                <small>Sincronizada {formatDateTime(campaign.synced_at)}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="visual-campaign-hero-insight">
          <div className="visual-campaign-insight-head">
            <span>Abertura</span>
            <span>
              {summary.opened}/{summary.total}
            </span>
          </div>
          <Ring value={openingRate} />
          <div className="visual-campaign-insight-footer">
            <strong>
              {percent(summary.clicked + summary.reported, summary.total)}%
            </strong>
            <span>exposição</span>
          </div>
        </div>
      </section>

      <section
        className="visual-campaign-metric-grid"
        aria-label="Resumo da campanha"
      >
        <article className="surface-card visual-campaign-metric">
          <span>Pessoas</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="surface-card visual-campaign-metric">
          <span>Entregues</span>
          <strong>{delivered}</strong>
          <small>{percent(delivered, summary.total)}%</small>
        </article>
        <article className="surface-card visual-campaign-metric metric-accent">
          <span>Abriram</span>
          <strong>{summary.opened}</strong>
          <small>{openingRate}%</small>
        </article>
        <article className="surface-card visual-campaign-metric metric-accent-dark">
          <span>Sinais</span>
          <strong>{summary.clicked + summary.reported}</strong>
          <small>
            {summary.clicked} cliques · {summary.reported} reportes
          </small>
        </article>
      </section>

      <section className="visual-campaign-content-grid">
        <article className="surface-card visual-campaign-people-card">
          <div className="visual-campaign-card-head">
            <div>
              <span className="visual-dashboard-overline">
                Pessoas impactadas
              </span>
              <strong>{visiblePeople.length}</strong>
            </div>
            <span>de {people.length}</span>
          </div>
          <div className="visual-campaign-controls">
            <label>
              <span className="sr-only">Buscar pessoa</span>
              <Icon name="search" size={15} />
              <input
                placeholder="Buscar pessoa"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
          </div>
          <div
            className="visual-campaign-filter-row"
            role="tablist"
            aria-label="Filtrar sinais"
          >
            {filterItems.map(([value, label]) => (
              <button
                className={filter === value ? "is-selected" : ""}
                key={value}
                onClick={() => onFilterChange(value)}
                role="tab"
                aria-selected={filter === value}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="visual-campaign-person-list">
            {visiblePeople.map((person) => (
              <button
                className="visual-campaign-person"
                key={person.id}
                onClick={() => onSelectPerson(person)}
                type="button"
                aria-label={`Abrir detalhes de ${person.name}`}
              >
                <PersonAvatar
                  avatar={person.avatar}
                  name={person.name}
                  size="md"
                />
                <span className="visual-campaign-person-name">
                  <strong>{person.name}</strong>
                  <small>{person.department}</small>
                </span>
                <SignalDots person={person} />
                <span className="visual-campaign-person-status">
                  {person.status}
                </span>
                <span
                  className="visual-campaign-person-arrow"
                  aria-hidden="true"
                >
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            ))}
            {!visiblePeople.length && (
              <div className="visual-campaign-empty">
                <Icon name="search" size={19} />
                <strong>Nenhuma pessoa encontrada</strong>
                <span>Ajuste a busca ou o filtro.</span>
              </div>
            )}
          </div>
        </article>

        <aside className="surface-card visual-campaign-timeline-card">
          <div className="visual-campaign-card-head">
            <div>
              <span className="visual-dashboard-overline">Atividade</span>
              <strong>{events.length}</strong>
            </div>
            <Icon name="chart" size={18} />
          </div>
          <div className="visual-campaign-timeline">
            {events.slice(0, 8).map((event) => (
              <div
                className="visual-campaign-event"
                key={event.beephish_event_id}
              >
                <i
                  className={
                    signalLabel(event.event_type)
                      .toLowerCase()
                      .includes("clicou")
                      ? "is-click"
                      : ""
                  }
                />
                <div>
                  <strong>{signalLabel(event.event_type)}</strong>
                  <small>{event.email ?? "Pessoa não identificada"}</small>
                  <time>{formatDateTime(event.occurred_at)}</time>
                </div>
              </div>
            ))}
            {!events.length && (
              <span className="visual-campaign-empty-text">Sem eventos</span>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
