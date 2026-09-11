"use client";

import { PersonAvatar } from "@/components/people/person-avatar";
import type {
  PersonDetails,
  PersonRiskLevel,
} from "@/components/people/person-details-modal";
import { Icon } from "@/components/ui/icon";

type RiskFilter = "all" | PersonRiskLevel;

type RiskSummary = {
  total: number;
  high: number;
  attention: number;
  low: number;
};

type VisualRiskContentProps = {
  campaignTotal: number;
  departments: string[];
  department: string;
  filter: RiskFilter;
  onDepartmentChange: (value: string) => void;
  onFilterChange: (value: RiskFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectPerson: (person: PersonDetails) => void;
  search: string;
  summary: RiskSummary;
  updatedAt: string | null;
  visiblePeople: PersonDetails[];
};

const filterItems: Array<[RiskFilter, string]> = [
  ["all", "Todos"],
  ["high", "Alto"],
  ["attention", "Atenção"],
  ["low", "Baixo"],
];

const riskNames: Record<PersonRiskLevel, string> = {
  high: "Alto",
  attention: "Atenção",
  low: "Baixo",
};

const riskColors: Record<PersonRiskLevel, string> = {
  high: "#e9685b",
  attention: "#b48b52",
  low: "#7b9d4b",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
    <span className="visual-risk-signal-dots" aria-label="Sinais observados">
      {signals.map((active, index) => (
        <i className={active ? `is-active signal-${index}` : ""} key={index} />
      ))}
    </span>
  );
}

function RiskRing({ summary }: { summary: RiskSummary }) {
  const highRate = percent(summary.high, summary.total);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (highRate / 100) * circumference;

  return (
    <div className="visual-risk-ring" aria-label={`${highRate}% de risco alto`}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle className="visual-risk-ring-track" cx="52" cy="52" r="45" />
        <circle
          className="visual-risk-ring-value"
          cx="52"
          cy="52"
          r="45"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <strong>{highRate}%</strong>
      <span>alto</span>
    </div>
  );
}

export function VisualRiskContent({
  campaignTotal,
  departments,
  department,
  filter,
  onDepartmentChange,
  onFilterChange,
  onSearchChange,
  onSelectPerson,
  search,
  summary,
  updatedAt,
  visiblePeople,
}: VisualRiskContentProps) {
  const levels: Array<{
    key: PersonRiskLevel;
    value: number;
  }> = [
    { key: "high", value: summary.high },
    { key: "attention", value: summary.attention },
    { key: "low", value: summary.low },
  ];

  return (
    <div className="visual-risk-dashboard">
      <section className="surface-card visual-risk-hero">
        <div className="visual-risk-hero-main">
          <div className="visual-risk-topline">
            <span className="visual-risk-icon">
              <Icon name="shield" size={16} />
            </span>
            <span className="visual-dashboard-live" />
            <span className="visual-dashboard-overline">Risco humano</span>
          </div>
          <div className="visual-risk-title-row">
            <div>
              <strong>{summary.high}</strong>
              <span>prioridade alta</span>
            </div>
            <div className="visual-risk-hero-meta">
              <span>{summary.total} pessoas</span>
              <span>{campaignTotal} campanhas</span>
            </div>
          </div>
          <div className="visual-risk-main-progress" aria-hidden="true">
            <i style={{ width: `${percent(summary.high, summary.total)}%` }} />
          </div>
          <div className="visual-risk-progress-meta">
            <span>{percent(summary.high, summary.total)}% da base</span>
            <span>Atualizado {formatDateTime(updatedAt)}</span>
          </div>
        </div>
        <div className="visual-risk-hero-insight">
          <div className="visual-risk-insight-topline">
            <span>Exposição</span>
            <Icon name="chart" size={16} />
          </div>
          <RiskRing summary={summary} />
          <div className="visual-risk-level-strip">
            {levels.map(({ key, value }) => (
              <div key={key}>
                <i style={{ backgroundColor: riskColors[key] }} />
                <strong>{value}</strong>
                <span>{riskNames[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="visual-risk-metric-grid" aria-label="Resumo de risco">
        <article className="surface-card visual-risk-metric">
          <span className="visual-risk-metric-icon">
            <Icon name="users" size={16} />
          </span>
          <strong>{summary.total}</strong>
          <span>pessoas</span>
        </article>
        {levels.map(({ key, value }) => (
          <article
            className={`surface-card visual-risk-metric risk-${key}`}
            key={key}
          >
            <span className="visual-risk-metric-icon">
              <i style={{ backgroundColor: riskColors[key] }} />
            </span>
            <strong>{value}</strong>
            <span>{riskNames[key]}</span>
          </article>
        ))}
      </section>

      <section className="visual-risk-content-grid">
        <article className="surface-card visual-risk-people-card">
          <div className="visual-risk-card-head">
            <div>
              <span className="visual-dashboard-overline">Pessoas</span>
              <strong>{visiblePeople.length}</strong>
            </div>
            <span className="visual-risk-card-head-note">
              de {summary.total}
            </span>
          </div>

          <div className="visual-risk-controls">
            <label className="visual-risk-search">
              <span className="sr-only">Buscar pessoa</span>
              <Icon name="search" size={15} />
              <input
                placeholder="Buscar pessoa"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por área"
              value={department}
              onChange={(event) => onDepartmentChange(event.target.value)}
            >
              <option value="all">Todas as áreas</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div
            className="visual-risk-filter-row"
            role="tablist"
            aria-label="Filtrar riscos"
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

          <div className="visual-risk-person-list">
            {visiblePeople.map((person) => (
              <button
                className="visual-risk-person"
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
                <span className="visual-risk-person-name">
                  <strong>{person.name}</strong>
                  <small>{person.department}</small>
                </span>
                <SignalDots person={person} />
                <span className="visual-risk-person-score">
                  <strong style={{ color: riskColors[person.risk] }}>
                    {person.score}
                  </strong>
                  <small>{riskNames[person.risk]}</small>
                </span>
                <span className="visual-risk-person-arrow" aria-hidden="true">
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            ))}
            {!visiblePeople.length && (
              <div className="visual-risk-empty">
                <Icon name="search" size={19} />
                <strong>Nenhuma pessoa encontrada</strong>
                <span>Ajuste a busca ou o filtro.</span>
              </div>
            )}
          </div>
        </article>

        <aside className="surface-card visual-risk-guide-card">
          <div className="visual-risk-card-head">
            <div>
              <span className="visual-dashboard-overline">Leitura</span>
              <strong>níveis</strong>
            </div>
            <Icon name="shield" size={18} />
          </div>
          <div className="visual-risk-guide-bars">
            {levels.map(({ key, value }) => (
              <div className={`visual-risk-guide-bar risk-${key}`} key={key}>
                <div>
                  <span>{riskNames[key]}</span>
                  <strong>{value}</strong>
                </div>
                <span className="visual-risk-guide-track">
                  <i
                    style={{
                      width: `${percent(value, summary.total)}%`,
                      backgroundColor: riskColors[key],
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="visual-risk-guide-footer">
            <span>4 sinais por pessoa</span>
            <span>clique para abrir</span>
          </div>
        </aside>
      </section>
    </div>
  );
}
