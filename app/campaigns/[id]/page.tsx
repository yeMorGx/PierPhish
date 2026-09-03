"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Stats = {
  total?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  email_reported?: number;
};

type Campaign = {
  id: number;
  name: string;
  status: string | null;
  synced_at: string | null;
  stats: Stats;
};

type RawResult = {
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
  beephish_event_id: string;
  event_type: string | null;
  email: string | null;
  occurred_at: string | null;
};

type Person = {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  opened: boolean;
  clicked: boolean;
  reported: boolean;
  lastActivity: string | null;
};

type Filter = "all" | "opened" | "clicked" | "reported";

const demoCampaign: Campaign = {
  id: 5345,
  name: "Amazon — Cupom de desconto",
  status: "In progress",
  synced_at: "2026-09-02T15:14:59Z",
  stats: { total: 11, delivered: 10, opened: 7, clicked: 2, email_reported: 5 },
};

const demoCampaignsById: Record<number, Campaign> = {
  5345: demoCampaign,
  5349: {
    id: 5349,
    name: "Caju",
    status: "In progress",
    synced_at: "2026-09-02T15:14:20Z",
    stats: { total: 2, delivered: 2, opened: 2, clicked: 0, email_reported: 0 },
  },
  5052: {
    id: 5052,
    name: "Teste anexo",
    status: "Completed",
    synced_at: "2026-09-01T10:20:00Z",
    stats: { total: 2, delivered: 2, opened: 2, clicked: 1, email_reported: 0 },
  },
  2581: {
    id: 2581,
    name: "Facebook",
    status: "Completed",
    synced_at: "2026-08-30T09:14:00Z",
    stats: { total: 2, delivered: 2, opened: 2, clicked: 2, email_reported: 0 },
  },
};

const demoResults: RawResult[] = [
  {
    beephish_id: "demo-ana",
    status: "Email Opened",
    reported: false,
    email: "ana.souza@empresa.com",
    first_name: "Ana",
    last_name: "Souza",
    position: "Analista",
    department: "Financeiro",
    modified_date: "2026-09-02T14:42:00Z",
    send_date: "2026-09-02T09:00:00Z",
  },
  {
    beephish_id: "demo-carlos",
    status: "Clicked Link",
    reported: false,
    email: "carlos.lima@empresa.com",
    first_name: "Carlos",
    last_name: "Lima",
    position: "Coordenador",
    department: "Operações",
    modified_date: "2026-09-02T13:18:00Z",
    send_date: "2026-09-02T09:00:00Z",
  },
  {
    beephish_id: "demo-juliana",
    status: "Email Reported",
    reported: true,
    email: "juliana.alves@empresa.com",
    first_name: "Juliana",
    last_name: "Alves",
    position: "Assistente",
    department: "Recursos Humanos",
    modified_date: "2026-09-02T12:06:00Z",
    send_date: "2026-09-02T09:00:00Z",
  },
  {
    beephish_id: "demo-rafael",
    status: "Delivered",
    reported: false,
    email: "rafael.martins@empresa.com",
    first_name: "Rafael",
    last_name: "Martins",
    position: "Especialista",
    department: "Tecnologia",
    modified_date: "2026-09-02T09:04:00Z",
    send_date: "2026-09-02T09:00:00Z",
  },
  {
    beephish_id: "demo-marina",
    status: "Email Opened",
    reported: false,
    email: "marina.costa@empresa.com",
    first_name: "Marina",
    last_name: "Costa",
    position: "Gerente",
    department: "Comercial",
    modified_date: "2026-09-01T17:22:00Z",
    send_date: "2026-09-01T09:00:00Z",
  },
];

const demoEvents: RawEvent[] = [
  {
    beephish_event_id: "demo-event-1",
    event_type: "Email Opened",
    email: "ana.souza@empresa.com",
    occurred_at: "2026-09-02T14:42:00Z",
  },
  {
    beephish_event_id: "demo-event-2",
    event_type: "Clicked Link",
    email: "carlos.lima@empresa.com",
    occurred_at: "2026-09-02T13:18:00Z",
  },
  {
    beephish_event_id: "demo-event-3",
    event_type: "Email Reported",
    email: "juliana.alves@empresa.com",
    occurred_at: "2026-09-02T12:06:00Z",
  },
  {
    beephish_event_id: "demo-event-4",
    event_type: "Email Opened",
    email: "marina.costa@empresa.com",
    occurred_at: "2026-09-01T17:22:00Z",
  },
];

function Icon({
  name,
  size = 18,
}: {
  name: "arrow" | "search" | "refresh" | "logout";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-14.9-4L3 10" />
        <path d="M3 4v6h6" />
        <path d="M4 13a8.1 8.1 0 0 0 14.9 4L21 14" />
        <path d="M21 20v-6h-6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
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

function containsSignal(value: string | null | undefined, terms: string[]) {
  const normalized = value?.toLowerCase() ?? "";
  return terms.some((term) => normalized.includes(term));
}

function statusLabel(value: string | null) {
  if (!value) return "Sem status";
  if (containsSignal(value, ["click", "link"])) return "Clicou";
  if (containsSignal(value, ["report"])) return "Reportou";
  if (containsSignal(value, ["open"])) return "Abriu";
  if (containsSignal(value, ["deliver"])) return "Entregue";
  if (containsSignal(value, ["send"])) return "Enviado";
  return value;
}

function fullName(result: RawResult) {
  const name = [result.first_name, result.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || result.email || "Pessoa sem nome";
}

export default function CampaignPeoplePage() {
  const params = useParams<{ id: string }>();
  const campaignId = Number(params.id);
  const invalidCampaignId = !Number.isFinite(campaignId) || campaignId <= 0;
  const demoCampaignForId = demoCampaignsById[campaignId] ?? null;
  const [campaign, setCampaign] = useState<Campaign | null>(
    isSupabaseConfigured ? null : demoCampaignForId,
  );
  const [results, setResults] = useState<RawResult[]>(
    isSupabaseConfigured || campaignId !== 5345 ? [] : demoResults,
  );
  const [events, setEvents] = useState<RawEvent[]>(
    isSupabaseConfigured || campaignId !== 5345 ? [] : demoEvents,
  );
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionEmail(data.session?.user.email ?? null);
      setSessionReady(true);
      if (data.session) void loadData();
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSessionEmail(currentSession?.user.email ?? null);
        setSessionReady(true);
        if (currentSession) void loadData();
        else setLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, invalidCampaignId]);

  async function loadData() {
    if (!supabase || invalidCampaignId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [
      { data: campaignData, error: campaignError },
      { data: resultData, error: resultError },
      { data: eventData, error: eventError },
    ] = await Promise.all([
      supabase
        .from("beephish_campaigns")
        .select("id,name,status,synced_at,stats")
        .eq("id", campaignId)
        .maybeSingle(),
      supabase
        .from("beephish_results")
        .select(
          "beephish_id,status,reported,email,first_name,last_name,position,department,modified_date,send_date",
        )
        .eq("campaign_id", campaignId)
        .order("modified_date", { ascending: false })
        .limit(500),
      supabase
        .from("beephish_events")
        .select("beephish_event_id,event_type,email,occurred_at")
        .eq("campaign_id", campaignId)
        .order("occurred_at", { ascending: false })
        .limit(500),
    ]);

    const queryError = campaignError ?? resultError ?? eventError;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setCampaign((campaignData as Campaign | null) ?? null);
    setResults((resultData ?? []) as RawResult[]);
    setEvents((eventData ?? []) as RawEvent[]);
    setLoading(false);
  }

  const people = useMemo<Person[]>(() => {
    const eventsByEmail = new Map<string, RawEvent[]>();
    for (const event of events) {
      if (!event.email) continue;
      const key = event.email.toLowerCase();
      eventsByEmail.set(key, [...(eventsByEmail.get(key) ?? []), event]);
    }

    return results.map((result) => {
      const relatedEvents = result.email
        ? (eventsByEmail.get(result.email.toLowerCase()) ?? [])
        : [];
      const signals = [
        result.status,
        ...relatedEvents.map((event) => event.event_type),
      ].join(" ");
      const lastActivity =
        [
          result.modified_date,
          ...relatedEvents.map((event) => event.occurred_at),
        ]
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
      return {
        id: result.beephish_id,
        name: fullName(result),
        email: result.email ?? "E-mail não informado",
        position: result.position ?? "—",
        department: result.department ?? "—",
        status: statusLabel(result.status),
        opened: containsSignal(signals, ["open"]),
        clicked: containsSignal(signals, ["click", "link"]),
        reported:
          Boolean(result.reported) || containsSignal(signals, ["report"]),
        lastActivity,
      };
    });
  }, [events, results]);

  const visiblePeople = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return people.filter((person) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "opened" && person.opened) ||
        (filter === "clicked" && person.clicked) ||
        (filter === "reported" && person.reported);
      const matchesSearch =
        !normalizedSearch ||
        `${person.name} ${person.email} ${person.department}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [filter, people, search]);

  const summary = useMemo(
    () => ({
      total: people.length,
      opened: people.filter((person) => person.opened).length,
      clicked: people.filter((person) => person.clicked).length,
      reported: people.filter((person) => person.reported).length,
    }),
    [people],
  );

  if (!sessionReady || loading) {
    return (
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="rounded-[var(--radius-card)] bg-[var(--surface)] px-8 py-7 text-[12px] text-[#7c8795] shadow-[0_18px_50px_rgba(25,34,45,0.08)]">
          Carregando dados da campanha…
        </div>
      </main>
    );
  }

  if (isSupabaseConfigured && !sessionEmail) {
    return (
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="w-full max-w-[430px] rounded-[31px] bg-[var(--surface)] p-10 text-center shadow-[0_25px_80px_rgba(21,30,41,0.08)]">
          <p className="mb-3 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            BEEPHISH LENS / ACCESS
          </p>
          <h1 className="m-0 mb-4 text-[29px] font-[680] tracking-[-0.06em]">
            Faça login para ver as pessoas.
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--ink)] px-4 py-3 text-[12px] font-bold text-white"
          >
            Voltar para o login <Icon name="arrow" size={15} />
          </Link>
        </div>
      </main>
    );
  }

  if (invalidCampaignId || !campaign) {
    return (
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="w-full max-w-[520px] rounded-[31px] bg-[var(--surface)] p-10 text-center shadow-[0_25px_80px_rgba(21,30,41,0.08)]">
          <p className="mb-3 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            BEEPHISH LENS / 404
          </p>
          <h1 className="m-0 text-[clamp(30px,5vw,44px)] font-[680] tracking-[-0.07em]">
            Campanha não encontrada.
          </h1>
          <p className="mx-auto mt-4 mb-7 max-w-[380px] text-[13px] leading-relaxed text-[#7b838d]">
            {invalidCampaignId
              ? "Informe um ID de campanha válido para abrir os dados individuais."
              : `Não existe uma campanha com o ID ${campaignId}.`}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--ink)] px-4 py-3 text-[12px] font-bold text-white"
          >
            Voltar para visão geral <Icon name="arrow" size={15} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-canvas min-h-screen p-[var(--shell-padding)] max-[1120px]:p-7 max-[720px]:p-[14px]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-[var(--cards-gap)]">
        <header className="flex items-center justify-between gap-6 rounded-[var(--radius-shell)] bg-[var(--surface)] px-8 py-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:flex-col max-[720px]:items-start max-[720px]:rounded-[23px] max-[720px]:px-6">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold text-[#7f8a94] transition-colors hover:text-[var(--ink)]"
            >
              <span className="rotate-180">
                <Icon name="arrow" size={15} />
              </span>{" "}
              Visão geral
            </Link>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              CAMPAIGN / {campaignId}
            </p>
            <h1 className="m-0 text-[clamp(30px,4vw,52px)] leading-[0.95] font-[680] tracking-[-0.07em]">
              {campaign?.name ?? `Campanha ${campaignId}`}
            </h1>
            <p className="mt-3 mb-0 text-[13px] text-[#7b838d]">
              Pessoas impactadas e sinais individuais desta campanha.
            </p>
          </div>
          <div className="flex flex-none items-center gap-3 max-[720px]:w-full max-[720px]:justify-between">
            <span className="inline-flex items-center gap-2 text-[11px] text-[#69717d]">
              <span className="size-2 rounded-full bg-[var(--success)] shadow-[0_0_0_4px_rgba(159,197,45,0.14)]" />
              {sessionEmail ?? "Modo demonstração"}
            </span>
            <button
              className="grid size-10 place-items-center rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] text-[#6f7883] transition hover:border-[#cbd0d5] hover:text-[var(--ink)]"
              type="button"
              aria-label="Atualizar dados"
              onClick={() => void loadData()}
            >
              <Icon name="refresh" size={17} />
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#fff0e8] px-4 py-3 text-[12px] text-[#75402d]">
            <span>{error}</span>
            <button
              className="border-0 bg-transparent text-[11px] underline"
              type="button"
              onClick={() => setError(null)}
            >
              Fechar
            </button>
          </div>
        )}

        <section className="grid grid-cols-4 gap-[var(--cards-gap)] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          {[
            ["Pessoas", summary.total, "na campanha", "text-[var(--ink)]"],
            [
              "Abriram",
              summary.opened,
              "visualizaram o e-mail",
              "text-[#617b88]",
            ],
            ["Clicaram", summary.clicked, "acessaram o link", "text-[#b4775e]"],
            [
              "Reportaram",
              summary.reported,
              "sinalizaram a mensagem",
              "text-[#768c4f]",
            ],
          ].map(([label, value, helper, color]) => (
            <article
              className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)]"
              key={String(label)}
            >
              <p className="m-0 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                {label}
              </p>
              <strong
                className={`mt-4 block text-[48px] leading-none font-[650] tracking-[-0.08em] ${color}`}
              >
                {value}
              </strong>
              <span className="mt-2 block text-[11px] text-[#87919a]">
                {helper}
              </span>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-1">
          <article className="min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px] max-[720px]:p-5">
            <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                  PESSOAS IMPACTADAS
                </p>
                <h2 className="m-0 text-[20px] font-bold tracking-[-0.04em]">
                  Quem recebeu e interagiu
                </h2>
                <p className="mt-2 mb-0 text-[12px] text-[#87919a]">
                  Use os filtros para investigar cada sinal da campanha.
                </p>
              </div>
              <label className="relative block w-[220px] max-[720px]:w-full">
                <span className="sr-only">Buscar pessoa</span>
                <Icon name="search" size={15} />
                <input
                  className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--line)] bg-[#fbfcfc] pr-3 pl-9 text-[11px] text-[var(--ink)] outline-none focus:border-[#8a9ba6] focus:ring-2 focus:ring-[#e6edef]"
                  placeholder="Buscar nome ou e-mail"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-b border-[#edf0f1] pb-4">
              {(
                [
                  ["all", "Todas"],
                  ["opened", "Abriram"],
                  ["clicked", "Clicaram"],
                  ["reported", "Reportaram"],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold transition-colors ${filter === value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[#e5e9ea] bg-transparent text-[#7d8790] hover:border-[#aab5bb]"}`}
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#edf0f1] text-[10px] font-extrabold tracking-[0.12em] text-[#9aa2a8] uppercase">
                    <th className="px-2 py-4 font-extrabold">Pessoa</th>
                    <th className="px-2 py-4 font-extrabold">Área</th>
                    <th className="px-2 py-4 font-extrabold">Status</th>
                    <th className="px-2 py-4 font-extrabold">Sinais</th>
                    <th className="px-2 py-4 text-right font-extrabold">
                      Última atividade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePeople.map((person) => (
                    <tr
                      className="border-b border-[#f0f2f2] last:border-0"
                      key={person.id}
                    >
                      <td className="px-2 py-4">
                        <strong className="block text-[12px] text-[#34404a]">
                          {person.name}
                        </strong>
                        <span className="mt-1 block max-w-[230px] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-[#9aa2a8]">
                          {person.email}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <span className="block text-[11px] text-[#65717b]">
                          {person.department}
                        </span>
                        <span className="mt-1 block text-[10px] text-[#a2a9ae]">
                          {person.position}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <span className="inline-flex rounded-full bg-[#f3f5f5] px-2.5 py-1.5 text-[10px] font-bold text-[#697680]">
                          {person.status}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex gap-1.5">
                          <Signal
                            active={person.opened}
                            label="abriu"
                            tone="blue"
                          />
                          <Signal
                            active={person.clicked}
                            label="clicou"
                            tone="orange"
                          />
                          <Signal
                            active={person.reported}
                            label="reportou"
                            tone="green"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right text-[10px] text-[#9aa2a8]">
                        {formatDateTime(person.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visiblePeople.length && (
                <div className="py-12 text-center text-[12px] text-[#9299a2]">
                  Nenhuma pessoa corresponde a este filtro.
                </div>
              )}
            </div>
          </article>

          <article className="min-w-0 rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px] max-[720px]:p-5">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              LINHA DO TEMPO
            </p>
            <h2 className="m-0 text-[20px] font-bold tracking-[-0.04em]">
              Atividade recente
            </h2>
            <div className="mt-6 flex flex-col">
              {events.slice(0, 8).map((event, index) => (
                <div
                  className="relative flex gap-3 border-b border-[#f0f2f2] py-4 first:pt-0 last:border-0"
                  key={event.beephish_event_id}
                >
                  <span
                    className={`mt-1.5 size-2 flex-none rounded-full ${containsSignal(event.event_type, ["click", "link"]) ? "bg-[#cf8b6b]" : containsSignal(event.event_type, ["report"]) ? "bg-[#9dbd47]" : "bg-[#8aa5b2]"}`}
                  />
                  <div className="min-w-0">
                    <strong className="block text-[11px] text-[#4f5963]">
                      {statusLabel(event.event_type)}
                    </strong>
                    <span className="mt-1 block max-w-[190px] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-[#a0a7ad]">
                      {event.email ?? "Pessoa não identificada"}
                    </span>
                    <time className="mt-1 block text-[10px] text-[#b0b6ba]">
                      {formatDateTime(event.occurred_at)}
                    </time>
                  </div>
                  <span className="ml-auto text-[#b8c0c4]">
                    <Icon name="arrow" size={14} />
                  </span>
                  {index < Math.min(events.length, 8) - 1 && (
                    <span className="absolute bottom-[-1px] left-[3px] h-4 w-px bg-[#edf0f1]" />
                  )}
                </div>
              ))}
              {!events.length && (
                <p className="py-6 text-[11px] text-[#9aa2a8]">
                  Nenhum evento sincronizado.
                </p>
              )}
            </div>
          </article>
        </section>

        <footer className="flex items-center justify-between px-2 py-2 text-[10px] text-[#a0a7ad] max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2">
          <span>
            Última sincronização: {formatDateTime(campaign?.synced_at ?? null)}
          </span>
          <span>BEEPHISH LENS · {sessionEmail ?? "DEMO"}</span>
        </footer>
      </div>
    </main>
  );
}

function Signal({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone: "blue" | "orange" | "green";
}) {
  const tones = {
    blue: "bg-[#edf3f5] text-[#6f8995]",
    orange: "bg-[#fff0e9] text-[#b4775e]",
    green: "bg-[#f0f6df] text-[#778d4e]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${active ? tones[tone] : "bg-[#f7f8f8] text-[#c1c7ca]"}`}
    >
      <span
        className={`size-1.5 rounded-full ${active ? (tone === "blue" ? "bg-[#7892a0]" : tone === "orange" ? "bg-[#cf8b6b]" : "bg-[#9dbd47]") : "bg-[#d4d9db]"}`}
      />
      {label}
    </span>
  );
}
