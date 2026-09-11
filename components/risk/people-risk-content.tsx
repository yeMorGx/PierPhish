"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  PersonDetailsModal,
  type PersonDetails,
} from "@/components/people/person-details-modal";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/components/theme/theme-provider";
import { VisualRiskContent } from "@/components/risk/visual-risk-content";
import { demoCampaigns } from "@/lib/demo-data";
import {
  readPersonAvatars,
  type PersonAvatarMap,
  writePersonAvatars,
} from "@/lib/person-avatars";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type RiskLevel = "high" | "attention" | "low";
type RiskFilter = "all" | RiskLevel;

type RawResult = {
  campaign_id: number;
  beephish_id: string;
  status: string | null;
  reported: boolean | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
  modified_date: string | null;
  send_date: string | null;
};

type RawEvent = {
  campaign_id: number;
  beephish_event_id: string;
  event_type: string | null;
  email: string | null;
  occurred_at: string | null;
};

type RiskPerson = PersonDetails;

type CampaignRow = {
  id: number;
  name: string;
  synced_at: string | null;
};

const demoRiskPeople: RiskPerson[] = [
  {
    id: "demo-ana",
    name: "Ana Souza",
    email: "ana.souza@empresa.com",
    position: "Analista",
    department: "Financeiro",
    campaigns: [{ id: 5345, name: demoCampaigns[0].name }],
    status: "Abriu",
    opened: true,
    clicked: false,
    reported: false,
    submitted: false,
    lastActivity: "2026-09-02T14:42:00Z",
    sentAt: "2026-09-02T09:00:00Z",
    risk: "attention",
    score: 2,
    events: [
      {
        id: "demo-ana-opened",
        label: "Abriu",
        occurredAt: "2026-09-02T14:42:00Z",
      },
    ],
  },
  {
    id: "demo-carlos",
    name: "Carlos Lima",
    email: "carlos.lima@empresa.com",
    position: "Coordenador",
    department: "Operações",
    campaigns: [{ id: 5345, name: demoCampaigns[0].name }],
    status: "Clicou",
    opened: true,
    clicked: true,
    reported: false,
    submitted: false,
    lastActivity: "2026-09-02T13:18:00Z",
    sentAt: "2026-09-02T09:00:00Z",
    risk: "high",
    score: 3,
    events: [
      {
        id: "demo-carlos-clicked",
        label: "Clicou",
        occurredAt: "2026-09-02T13:18:00Z",
      },
    ],
  },
  {
    id: "demo-juliana",
    name: "Juliana Alves",
    email: "juliana.alves@empresa.com",
    position: "Assistente",
    department: "Recursos Humanos",
    campaigns: [{ id: 5349, name: demoCampaigns[1].name }],
    status: "Reportou",
    opened: false,
    clicked: false,
    reported: true,
    submitted: false,
    lastActivity: "2026-09-02T12:06:00Z",
    sentAt: "2026-09-02T09:00:00Z",
    risk: "low",
    score: 1,
    events: [
      {
        id: "demo-juliana-reported",
        label: "Reportou",
        occurredAt: "2026-09-02T12:06:00Z",
      },
    ],
  },
  {
    id: "demo-rafael",
    name: "Rafael Martins",
    email: "rafael.martins@empresa.com",
    position: "Especialista",
    department: "Tecnologia",
    campaigns: [{ id: 5052, name: demoCampaigns[2].name }],
    status: "Entregue",
    opened: false,
    clicked: false,
    reported: false,
    submitted: false,
    lastActivity: "2026-09-02T09:04:00Z",
    sentAt: "2026-09-02T09:00:00Z",
    risk: "low",
    score: 0,
    events: [],
  },
  {
    id: "demo-marina",
    name: "Marina Costa",
    email: "marina.costa@empresa.com",
    position: "Gerente",
    department: "Comercial",
    campaigns: [
      { id: 5345, name: demoCampaigns[0].name },
      { id: 2581, name: demoCampaigns[3].name },
    ],
    status: "Abriu",
    opened: true,
    clicked: false,
    reported: false,
    submitted: false,
    lastActivity: "2026-09-01T17:22:00Z",
    sentAt: "2026-09-01T09:00:00Z",
    risk: "attention",
    score: 2,
    events: [
      {
        id: "demo-marina-opened",
        label: "Abriu",
        occurredAt: "2026-09-01T17:22:00Z",
      },
    ],
  },
];

function containsSignal(value: string | null | undefined, terms: string[]) {
  const normalized = value?.toLowerCase() ?? "";
  return terms.some((term) => normalized.includes(term));
}

function fullName(result: RawResult) {
  const name = [result.first_name, result.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || result.email || "Pessoa sem nome";
}

function statusLabel(value: string | null) {
  if (!value) return "Sem status";
  if (containsSignal(value, ["click", "link", "clicou"])) return "Clicou";
  if (containsSignal(value, ["report", "reportou"])) return "Reportou";
  if (containsSignal(value, ["open", "abriu"])) return "Abriu";
  if (containsSignal(value, ["deliver", "entregue"])) return "Entregue";
  if (containsSignal(value, ["send", "enviado"])) return "Enviado";
  return value;
}

function latestDate(values: (string | null | undefined)[]) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((first, second) => Date.parse(second) - Date.parse(first))[0] ??
    null
  );
}

function riskFromSignals({
  clicked,
  opened,
  submitted,
}: Pick<RiskPerson, "clicked" | "opened" | "submitted">): RiskLevel {
  if (submitted || clicked) return "high";
  if (opened) return "attention";
  return "low";
}

function scoreFromSignals({
  clicked,
  opened,
  reported,
  submitted,
}: Pick<RiskPerson, "clicked" | "opened" | "reported" | "submitted">) {
  if (submitted) return 4;
  if (clicked) return 3;
  if (opened) return 2;
  if (reported) return 1;
  return 0;
}

function buildPeople(
  results: RawResult[],
  events: RawEvent[],
  campaigns: CampaignRow[],
  personAvatars: PersonAvatarMap = {},
) {
  const campaignById = new Map(
    campaigns.map((campaign) => [campaign.id, campaign]),
  );
  const eventsByPerson = new Map<string, RawEvent[]>();

  for (const event of events) {
    if (!event.email) continue;
    const key = `${event.campaign_id}:${event.email.toLowerCase()}`;
    eventsByPerson.set(key, [...(eventsByPerson.get(key) ?? []), event]);
  }

  const peopleByKey = new Map<string, RiskPerson>();

  for (const result of results) {
    const personKey = result.email
      ? result.email.toLowerCase()
      : `${result.campaign_id}:${result.beephish_id}`;
    const relatedEvents = result.email
      ? (eventsByPerson.get(
          `${result.campaign_id}:${result.email.toLowerCase()}`,
        ) ?? [])
      : [];
    const signals = [
      result.status,
      ...relatedEvents.map((event) => event.event_type),
    ].join(" ");
    const opened = containsSignal(signals, ["open", "abriu"]);
    const clicked = containsSignal(signals, ["click", "link", "clicou"]);
    const reported =
      Boolean(result.reported) ||
      containsSignal(signals, ["report", "reportou"]);
    const submitted = containsSignal(signals, [
      "submitted",
      "submit",
      "dados enviados",
      "data sent",
      "enviou dados",
    ]);
    const activity = latestDate([
      result.modified_date,
      ...relatedEvents.map((event) => event.occurred_at),
    ]);
    const campaign = campaignById.get(result.campaign_id);
    const existing = peopleByKey.get(personKey);

    if (existing) {
      existing.opened ||= opened;
      existing.clicked ||= clicked;
      existing.reported ||= reported;
      existing.submitted ||= submitted;
      existing.lastActivity = latestDate([existing.lastActivity, activity]);
      existing.sentAt = latestDate([existing.sentAt, result.send_date]);
      existing.events = [
        ...existing.events,
        ...relatedEvents.map((event) => ({
          id: event.beephish_event_id,
          label: statusLabel(event.event_type),
          occurredAt: event.occurred_at,
        })),
      ].filter(
        (event, index, allEvents) =>
          allEvents.findIndex((item) => item.id === event.id) === index,
      );
      if (
        campaign &&
        !existing.campaigns.some((item) => item.id === campaign.id)
      ) {
        existing.campaigns.push({ id: campaign.id, name: campaign.name });
      }
      existing.risk = riskFromSignals(existing);
      existing.score = scoreFromSignals(existing);
      continue;
    }

    const person: RiskPerson = {
      avatar: personAvatars[personKey] ?? null,
      id: personKey,
      name: fullName(result),
      email: result.email ?? "E-mail não informado",
      position: result.position ?? "—",
      department: result.department ?? "—",
      status: statusLabel(result.status),
      campaigns: campaign ? [{ id: campaign.id, name: campaign.name }] : [],
      opened,
      clicked,
      reported,
      submitted,
      lastActivity: activity,
      sentAt: result.send_date,
      risk: riskFromSignals({ clicked, opened, submitted }),
      score: scoreFromSignals({ clicked, opened, reported, submitted }),
      events: relatedEvents
        .map((event) => ({
          id: event.beephish_event_id,
          label: statusLabel(event.event_type),
          occurredAt: event.occurred_at,
        }))
        .sort(
          (first, second) =>
            (Date.parse(second.occurredAt ?? "") || 0) -
            (Date.parse(first.occurredAt ?? "") || 0),
        ),
    };
    peopleByKey.set(personKey, person);
  }

  return [...peopleByKey.values()].sort(
    (first, second) =>
      second.score - first.score ||
      (Date.parse(second.lastActivity ?? "") || 0) -
        (Date.parse(first.lastActivity ?? "") || 0) ||
      first.name.localeCompare(second.name, "pt-BR"),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const riskLabels: Record<RiskLevel, string> = {
  high: "Alto",
  attention: "Atenção",
  low: "Baixo",
};

const riskDescriptions: Record<RiskLevel, string> = {
  high: "Clicou ou enviou dados",
  attention: "Abriu a mensagem",
  low: "Sem exposição crítica",
};

function Signal({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone: "blue" | "orange" | "green" | "red";
}) {
  return (
    <span
      className={`risk-signal risk-signal-${tone} ${active ? "is-active" : ""}`}
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`risk-level risk-level-${level}`}>
      <span aria-hidden="true" />
      {riskLabels[level]}
    </span>
  );
}

function PeopleRiskPage() {
  const { preferences: themePreferences } = useTheme();
  const [people, setPeople] = useState<RiskPerson[]>(
    isSupabaseConfigured ? [] : demoRiskPeople,
  );
  const [campaignTotal, setCampaignTotal] = useState(
    isSupabaseConfigured ? 0 : demoCampaigns.length,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    isSupabaseConfigured ? null : "2026-09-02T15:14:59Z",
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonDetails | null>(
    null,
  );
  const [personAvatars, setPersonAvatars] = useState<PersonAvatarMap>({});

  useEffect(() => {
    const avatars = readPersonAvatars();
    setPersonAvatars(avatars);
    setPeople((current) =>
      current.map((person) => ({
        ...person,
        avatar: avatars[person.id] ?? person.avatar ?? null,
      })),
    );
  }, []);

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const [campaignResult, resultResult, eventResult] = await Promise.all([
      supabase
        .from("beephish_campaigns")
        .select("id,name,synced_at")
        .order("launch_date", { ascending: false }),
      supabase
        .from("beephish_results")
        .select(
          "campaign_id,beephish_id,status,reported,email,first_name,last_name,position,department,modified_date,send_date",
        )
        .order("modified_date", { ascending: false })
        .limit(5000),
      supabase
        .from("beephish_events")
        .select("campaign_id,beephish_event_id,event_type,email,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(5000),
    ]);

    const queryError =
      campaignResult.error ?? resultResult.error ?? eventResult.error;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const campaignRows = (campaignResult.data ?? []) as CampaignRow[];
    setCampaignTotal(campaignRows.length);
    setPeople(
      buildPeople(
        (resultResult.data ?? []) as RawResult[],
        (eventResult.data ?? []) as RawEvent[],
        campaignRows,
        readPersonAvatars(),
      ),
    );
    setUpdatedAt(
      latestDate(campaignRows.map((campaign) => campaign.synced_at)),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (supabase) void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarChange(personId: string, avatar: string) {
    const nextAvatars = { ...personAvatars, [personId]: avatar };
    setPersonAvatars(nextAvatars);
    writePersonAvatars(nextAvatars);
    setPeople((current) =>
      current.map((person) =>
        person.id === personId ? { ...person, avatar } : person,
      ),
    );
    setSelectedPerson((current) =>
      current?.id === personId ? { ...current, avatar } : current,
    );
  }

  const summary = useMemo(
    () => ({
      total: people.length,
      high: people.filter((person) => person.risk === "high").length,
      attention: people.filter((person) => person.risk === "attention").length,
      low: people.filter((person) => person.risk === "low").length,
    }),
    [people],
  );

  const departments = useMemo(
    () =>
      [
        ...new Set(
          people
            .map((person) => person.department)
            .filter((item) => item !== "—"),
        ),
      ].sort((first, second) => first.localeCompare(second, "pt-BR")),
    [people],
  );

  const visiblePeople = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return people.filter((person) => {
      const searchText = [
        person.name,
        person.email,
        person.department,
        ...person.campaigns.map((campaign) => campaign.name),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (filter === "all" || person.risk === filter) &&
        (department === "all" || person.department === department) &&
        (!normalizedSearch || searchText.includes(normalizedSearch))
      );
    });
  }, [department, filter, people, search]);

  return (
    <DashboardShell
      activeSection="risk"
      title="Pessoas por risco"
      headerAction={
        <button
          className="header-sync-button inline-flex min-h-[38px] items-center gap-[9px] rounded-[12px] border-0 px-[15px] text-[12px] font-bold shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors max-[720px]:px-[11px]"
          onClick={() => void loadData()}
          disabled={loading}
          type="button"
          aria-label={loading ? "Atualizando leitura" : "Atualizar leitura"}
        >
          <Icon name="refresh" size={16} />
          <span
            className={
              themePreferences.dashboardMode === "visual" ? "sr-only" : ""
            }
          >
            {loading ? "Atualizando…" : "Atualizar leitura"}
          </span>
        </button>
      }
    >
      <div className="grid gap-[var(--cards-gap)]">
        {error && (
          <div className="risk-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Fechar
            </button>
          </div>
        )}

        {themePreferences.dashboardMode === "visual" ? (
          <VisualRiskContent
            campaignTotal={campaignTotal}
            departments={departments}
            department={department}
            filter={filter}
            onDepartmentChange={setDepartment}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onSelectPerson={setSelectedPerson}
            search={search}
            summary={summary}
            updatedAt={updatedAt}
            visiblePeople={visiblePeople}
          />
        ) : (
          <>
            <section className="surface-card grid grid-cols-[minmax(0,1fr)_300px] gap-8 overflow-hidden rounded-[var(--radius-card)] p-8 max-[900px]:grid-cols-1 max-[720px]:rounded-[23px] max-[720px]:p-6">
              <div className="min-w-0">
                <p className="mb-3 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                  CENTRO DE RISCO
                </p>
                <h2 className="m-0 max-w-[640px] text-[clamp(34px,5vw,58px)] leading-[0.93] font-[680] tracking-[-0.08em]">
                  Pessoas que pedem atenção.
                </h2>
                <p className="mt-5 mb-0 max-w-[620px] text-[13px] leading-relaxed text-[#7c8795]">
                  Uma leitura consolidada de todas as campanhas, com os sinais
                  que ajudam a priorizar orientação e resposta.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[#87919a]">
                  <span>{campaignTotal} campanhas analisadas</span>
                  <span>{summary.total} pessoas consolidadas</span>
                  <span>Atualizado {formatDateTime(updatedAt)}</span>
                </div>
              </div>
              <div className="risk-hero-meter">
                <div className="risk-hero-meter-top">
                  <span>PRIORIDADE MÁXIMA</span>
                  <Icon name="shield" size={18} />
                </div>
                <strong>{summary.high}</strong>
                <span>pessoas em risco alto</span>
                <div className="risk-hero-meter-track">
                  <span
                    style={{
                      width: `${summary.total ? Math.round((summary.high / summary.total) * 100) : 0}%`,
                    }}
                  />
                </div>
                <small>
                  {summary.total
                    ? `${Math.round((summary.high / summary.total) * 100)}% da base consolidada`
                    : "Nenhuma pessoa analisada"}
                </small>
              </div>
            </section>

            <section className="grid grid-cols-4 gap-[var(--cards-gap)] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
              {(
                [
                  [
                    "Pessoas analisadas",
                    summary.total,
                    "todas as campanhas",
                    "neutral",
                  ],
                  [
                    "Risco alto",
                    summary.high,
                    "clicou ou enviou dados",
                    "high",
                  ],
                  [
                    "Atenção",
                    summary.attention,
                    "abriu a mensagem",
                    "attention",
                  ],
                  ["Baixo", summary.low, "sem exposição crítica", "low"],
                ] as [string, number, string, "neutral" | RiskLevel][]
              ).map(([label, value, helper, tone]) => (
                <article
                  className={`risk-summary-card risk-summary-${tone}`}
                  key={label}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{helper}</small>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-[minmax(0,1.45fr)_minmax(270px,0.55fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-1">
              <article className="surface-card min-w-0 overflow-hidden rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px] max-[720px]:p-5">
                <div className="flex items-end justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
                  <div>
                    <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                      PRIORIZAÇÃO INDIVIDUAL
                    </p>
                    <h2 className="m-0 text-[20px] font-bold tracking-[-0.04em]">
                      Mapa de exposição
                    </h2>
                    <p className="mt-2 mb-0 text-[12px] text-[#87919a]">
                      Uma pessoa pode aparecer em mais de uma campanha.
                    </p>
                  </div>
                  <label className="risk-search-field relative block w-[230px] max-[720px]:w-full">
                    <span className="sr-only">Buscar pessoa</span>
                    <Icon name="search" size={15} />
                    <input
                      className="risk-search-input"
                      placeholder="Buscar nome, e-mail ou campanha"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f1] pb-4">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", "Todas"],
                        ["high", "Risco alto"],
                        ["attention", "Atenção"],
                        ["low", "Baixo"],
                      ] as [RiskFilter, string][]
                    ).map(([value, label]) => (
                      <button
                        className={`risk-filter ${filter === value ? "is-selected" : ""}`}
                        type="button"
                        key={value}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="sr-only" htmlFor="risk-department">
                    Filtrar por área
                  </label>
                  <select
                    className="risk-department-select"
                    id="risk-department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  >
                    <option value="all">Todas as áreas</option>
                    {departments.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="risk-table w-full min-w-[820px] border-collapse text-left">
                    <thead>
                      <tr>
                        <th>Pessoa</th>
                        <th>Campanhas</th>
                        <th>Sinais observados</th>
                        <th>Risco</th>
                        <th>Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePeople.map((person) => (
                        <tr key={person.id}>
                          <td>
                            <div className="risk-person-cell">
                              <button
                                aria-label={`Abrir detalhes de ${person.name}`}
                                className="risk-person-trigger risk-person-trigger-with-avatar"
                                onClick={() => setSelectedPerson(person)}
                                type="button"
                              >
                                <PersonAvatar
                                  avatar={person.avatar}
                                  name={person.name}
                                  size="sm"
                                />
                                <span className="min-w-0">
                                  <strong>{person.name}</strong>
                                  <small>{person.email}</small>
                                  <em>
                                    {person.department} · {person.position}
                                  </em>
                                </span>
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="risk-campaign-list">
                              {person.campaigns.slice(0, 2).map((campaign) => (
                                <a
                                  href={`/campaigns/${campaign.id}`}
                                  key={campaign.id}
                                >
                                  {campaign.name}
                                </a>
                              ))}
                              {person.campaigns.length > 2 && (
                                <span>
                                  +{person.campaigns.length - 2} outras
                                </span>
                              )}
                              {!person.campaigns.length && (
                                <span>Sem campanha</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              <Signal
                                active={person.submitted}
                                label="dados"
                                tone="red"
                              />
                              <Signal
                                active={person.clicked}
                                label="clicou"
                                tone="orange"
                              />
                              <Signal
                                active={person.opened}
                                label="abriu"
                                tone="blue"
                              />
                              <Signal
                                active={person.reported}
                                label="reportou"
                                tone="green"
                              />
                            </div>
                          </td>
                          <td>
                            <div className="risk-cell">
                              <RiskBadge level={person.risk} />
                              <small>{riskDescriptions[person.risk]}</small>
                            </div>
                          </td>
                          <td className="risk-last-activity">
                            {formatDateTime(person.lastActivity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visiblePeople.length && (
                    <div className="risk-empty-state">
                      <strong>Nenhuma pessoa encontrada.</strong>
                      <span>Tente mudar o filtro ou a busca.</span>
                    </div>
                  )}
                </div>
                <p className="mt-4 mb-0 text-[10px] text-[#87919a]">
                  Mostrando {visiblePeople.length} de {people.length} pessoas
                  consolidadas.
                </p>
              </article>

              <aside className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px] max-[720px]:p-5">
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                  LEITURA DO RISCO
                </p>
                <h2 className="m-0 text-[20px] font-bold tracking-[-0.04em]">
                  O que cada nível significa
                </h2>
                <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[#87919a]">
                  A classificação prioriza comportamento observado, não o cargo
                  ou a área da pessoa.
                </p>
                <div className="risk-guide-list">
                  {(["high", "attention", "low"] as RiskLevel[]).map(
                    (level) => (
                      <div className="risk-guide-item" key={level}>
                        <RiskBadge level={level} />
                        <span>{riskDescriptions[level]}</span>
                      </div>
                    ),
                  )}
                </div>
                <div className="risk-guide-note">
                  <Icon name="shield" size={16} />
                  <span>
                    Use esta visão para priorizar orientação e acompanhamento.
                    Um risco baixo não substitui a análise dos eventos da
                    campanha.
                  </span>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
      <PersonDetailsModal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onAvatarChange={handleAvatarChange}
      />
    </DashboardShell>
  );
}

export default function PeopleRiskContent() {
  return (
    <AuthGuard>
      <PeopleRiskPage />
    </AuthGuard>
  );
}
