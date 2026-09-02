"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Stats = {
  total?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  submitted_data?: number;
  email_reported?: number;
  error?: number;
};

type Campaign = {
  id: number;
  name: string;
  status: string | null;
  launch_date: string | null;
  synced_at: string | null;
  stats: Stats;
};

type Result = {
  beephish_id: string;
  status: string | null;
  reported: boolean;
  department: string | null;
  modified_date: string | null;
};

type EventRow = {
  id: number;
  event_type: string | null;
  occurred_at: string | null;
};

const demoCampaigns: Campaign[] = [
  {
    id: 5345,
    name: "Amazon — Cupom de desconto",
    status: "In progress",
    launch_date: "2026-08-07T11:01:00Z",
    synced_at: "2026-09-02T15:14:59Z",
    stats: {
      total: 11,
      sent: 11,
      delivered: 10,
      opened: 7,
      clicked: 2,
      submitted_data: 0,
      email_reported: 5,
      error: 0,
    },
  },
  {
    id: 5349,
    name: "Caju",
    status: "In progress",
    launch_date: "2026-08-07T11:00:00Z",
    synced_at: "2026-09-02T15:14:20Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 0,
      submitted_data: 0,
      email_reported: 0,
      error: 0,
    },
  },
  {
    id: 5052,
    name: "Teste anexo",
    status: "Completed",
    launch_date: "2026-07-18T10:00:00Z",
    synced_at: "2026-09-01T10:20:00Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 1,
      submitted_data: 0,
      email_reported: 0,
      error: 0,
    },
  },
  {
    id: 2581,
    name: "Facebook",
    status: "Completed",
    launch_date: "2025-11-04T18:55:00Z",
    synced_at: "2026-08-30T09:14:00Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 2,
      submitted_data: 2,
      email_reported: 0,
      error: 0,
    },
  },
];

function Icon({
  name,
  size = 20,
}: {
  name:
    | "grid"
    | "chart"
    | "users"
    | "shield"
    | "settings"
    | "refresh"
    | "arrow"
    | "logout"
    | "chevron";
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
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 3-4 3 2 5-7" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03h-.2v-2.4h.2A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.2A1.7 1.7 0 0 0 16.1 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.03h.2v2.4h-.2A1.7 1.7 0 0 0 19.4 15Z" />
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
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function statusLabel(status: string | null) {
  if (!status) return "Sem status";
  const labels: Record<string, string> = {
    "In progress": "Em andamento",
    Completed: "Concluída",
  };
  return labels[status] ?? status;
}

function statusClass(status: string | null) {
  if (status === "Completed") return "bg-[#edf5ee] text-[#5d7161]";
  if (status === "In progress") return "bg-[#fff6e7] text-[#926f35]";
  return "bg-[#f4f6f7] text-[#7c8795]";
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [selectedId, setSelectedId] = useState(5345);
  const [results, setResults] = useState<Result[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncing, setSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedId) ??
    campaigns[0] ??
    null;
  const stats = selectedCampaign?.stats ?? {};
  const total = Number(stats.total ?? 0);
  const opened = Number(stats.opened ?? 0);
  const clicked = Number(stats.clicked ?? 0);
  const reported = Number(stats.email_reported ?? 0);
  const delivered = Number(stats.delivered ?? 0);

  const campaignBars = useMemo(() => {
    return campaigns.slice(0, 4).map((campaign) => ({
      ...campaign,
      rate: pct(
        Number(campaign.stats.opened ?? 0),
        Number(campaign.stats.total ?? 0),
      ),
    }));
  }, [campaigns]);

  const campaignSummary = useMemo(() => {
    return [...campaigns]
      .map((campaign) => {
        const campaignStats = campaign.stats ?? {};
        const people = Number(campaignStats.total ?? 0);
        const deliveredPeople = Number(campaignStats.delivered ?? 0);
        const openedPeople = Number(campaignStats.opened ?? 0);
        const clickedPeople = Number(campaignStats.clicked ?? 0);
        const reportedPeople = Number(campaignStats.email_reported ?? 0);

        return {
          ...campaign,
          people,
          deliveredPeople,
          openedPeople,
          clickedPeople,
          reportedPeople,
          openRate: pct(openedPeople, people),
        };
      })
      .sort(
        (first, second) =>
          second.people - first.people ||
          second.deliveredPeople - first.deliveredPeople,
      );
  }, [campaigns]);

  const overviewTotals = useMemo(
    () => ({
      people: campaignSummary.reduce(
        (sum, campaign) => sum + campaign.people,
        0,
      ),
      delivered: campaignSummary.reduce(
        (sum, campaign) => sum + campaign.deliveredPeople,
        0,
      ),
      opened: campaignSummary.reduce(
        (sum, campaign) => sum + campaign.openedPeople,
        0,
      ),
      clicked: campaignSummary.reduce(
        (sum, campaign) => sum + campaign.clickedPeople,
        0,
      ),
    }),
    [campaignSummary],
  );

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionEmail(data.session?.user.email ?? null);
      if (data.session) void loadCampaigns();
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSessionEmail(currentSession?.user.email ?? null);
        if (currentSession) void loadCampaigns();
        else setLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (supabase && sessionEmail && selectedCampaign)
      void loadDetails(selectedCampaign.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, sessionEmail]);

  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      )
        setProfileOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  async function loadCampaigns() {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("beephish_campaigns")
      .select("id,name,status,launch_date,synced_at,stats")
      .order("launch_date", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const nextCampaigns = (data ?? []) as Campaign[];
    setCampaigns(nextCampaigns);
    if (
      nextCampaigns.length &&
      !nextCampaigns.some((campaign) => campaign.id === selectedId)
    )
      setSelectedId(nextCampaigns[0].id);
    if (nextCampaigns.length)
      await loadDetails(
        nextCampaigns.find((campaign) => campaign.id === selectedId)?.id ??
          nextCampaigns[0].id,
      );
    setLoading(false);
  }

  async function loadDetails(campaignId: number) {
    if (!supabase) return;
    const [{ data: nextResults }, { data: nextEvents }] = await Promise.all([
      supabase
        .from("beephish_results")
        .select("beephish_id,status,reported,department,modified_date")
        .eq("campaign_id", campaignId)
        .order("modified_date", { ascending: false })
        .limit(8),
      supabase
        .from("beephish_events")
        .select("id,event_type,occurred_at")
        .eq("campaign_id", campaignId)
        .order("occurred_at", { ascending: false })
        .limit(8),
    ]);
    setResults((nextResults ?? []) as Result[]);
    setEvents((nextEvents ?? []) as EventRow[]);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    setAuthLoading(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setProfileOpen(false);
    setResults([]);
    setEvents([]);
  }

  async function syncSelectedCampaign() {
    if (!supabase || !selectedCampaign) return;
    setSyncing(true);
    setError(null);
    const { error: syncError } = await supabase.functions.invoke(
      "sync-beephish",
      { body: { campaignId: selectedCampaign.id } },
    );
    if (syncError) setError(syncError.message);
    else await loadCampaigns();
    setSyncing(false);
  }

  if (isSupabaseConfigured && !sessionEmail) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_68%_20%,#f8faf8,transparent_32%),#f4f4f4] p-7">
        <div className="w-full max-w-[430px] rounded-[31px] bg-[var(--surface)] p-[42px] shadow-[0_25px_80px_rgba(21,30,41,0.08)] max-[720px]:p-[30px_24px]">
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            BEEPHISH LENS / ACCESS
          </p>
          <h1 className="m-0 mb-[14px] text-[37px] leading-[0.95] font-[680] tracking-[-0.065em]">
            Entre no centro de risco.
          </h1>
          <p className="mb-[30px] max-w-[280px] text-[13px] leading-[1.5] text-[#8b939b]">
            Acompanhe sinais de exposição humana com clareza operacional.
          </p>
          <form onSubmit={signIn} className="flex flex-col gap-4">
            <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#6c747d]">
              E-mail
              <input
                className="h-[43px] rounded-[11px] border border-[#e3e6e7] bg-[#fbfcfc] px-3 text-[13px] text-[#18202b] outline-none focus:border-[#8a9ba6] focus:ring-[3px] focus:ring-[rgba(138,155,166,0.13)]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#6c747d]">
              Senha
              <input
                className="h-[43px] rounded-[11px] border border-[#e3e6e7] bg-[#fbfcfc] px-3 text-[13px] text-[#18202b] outline-none focus:border-[#8a9ba6] focus:ring-[3px] focus:ring-[rgba(138,155,166,0.13)]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="m-0 rounded-[9px] bg-[#fff0e9] px-3 py-2.5 text-[11px] text-[#8b4d39]">
                {error}
              </p>
            )}
            <button
              className="mt-[5px] inline-flex h-[45px] w-full items-center justify-center gap-[9px] rounded-[12px] border-0 bg-[#18202b] px-[15px] text-[12px] font-bold text-white shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors hover:bg-[#2d3a49]"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? "Entrando…" : "Entrar"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="mt-[26px] mb-0 text-[10px] text-[#a3a8ad]">
            Acesso interno protegido pelo Supabase Auth.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid h-screen min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-[var(--shell-gap)] overflow-hidden bg-[var(--canvas)] p-[var(--shell-padding)] transition-all duration-200 max-[1120px]:p-7 max-[720px]:h-auto max-[720px]:min-h-screen max-[720px]:grid-cols-1 max-[720px]:gap-2.5 max-[720px]:overflow-visible max-[720px]:p-[14px]">
      <aside
        className="flex h-[calc(100vh-112px)] min-h-0 flex-col gap-[var(--shell-gap)] max-[1120px]:h-[calc(100vh-56px)] max-[720px]:h-[67px] max-[720px]:flex-row max-[720px]:gap-2"
        aria-label="Navegação principal"
      >
        <div
          className="relative grid size-[var(--sidebar-width)] flex-none place-items-center max-[720px]:size-[67px] max-[720px]:basis-[67px]"
          ref={profileMenuRef}
        >
          <button
            className="group grid size-[var(--avatar-size)] place-items-center rounded-full border-1 bg-[var(--ink)] text-[16px] font-extrabold text-white shadow-[0_8px_18px_rgba(24,32,43,0.12)] transition-all duration-200 outline-none hover:border-5 focus-visible:ring-4 focus-visible:ring-[#b9c7cf] max-[720px]:size-[54px]"
            type="button"
            aria-label="Abrir menu do perfil"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            {sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "D"}
          </button>
          {profileOpen && (
            <div
              className="absolute top-0 left-[calc(100%+12px)] z-50 w-[238px] rounded-[22px] border border-[#edf0f1] bg-[var(--surface)] p-2 shadow-[0_18px_45px_rgba(25,34,45,0.14)] max-[720px]:top-full max-[720px]:left-0 max-[720px]:mt-2"
              role="menu"
            >
              <div className="flex items-center gap-3 rounded-[16px] bg-[#f5f7f7] p-3">
                <span className="grid size-9 flex-none place-items-center rounded-full bg-[#18202b] text-[11px] font-extrabold text-white">
                  {sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "D"}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-extrabold text-[#18202b]">
                    {sessionEmail ? "Conta conectada" : "Modo demonstração"}
                  </p>
                  <p className="m-0 max-w-[166px] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-[#87919a]">
                    {sessionEmail ?? "Dados locais de demonstração"}
                  </p>
                </div>
              </div>
              <div className="my-2 h-px bg-[#edf0f1]" />
              <button
                className="flex w-full items-center gap-2.5 rounded-[13px] border-0 bg-transparent px-3 py-2.5 text-left text-[11px] font-bold text-[#66717b] transition-colors hover:bg-[#fff1ed] hover:text-[#a5553b] focus-visible:bg-[#fff1ed] focus-visible:text-[#a5553b]"
                type="button"
                role="menuitem"
                onClick={() => void signOut()}
              >
                <Icon name="logout" size={16} />
                Sair<span className="ml-auto text-[14px] leading-none">↗</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between rounded-[var(--radius-shell)] bg-[var(--surface)] p-4 px-3 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:flex-row max-[720px]:rounded-[23px] max-[720px]:p-[9px_12px]">
          <div className="flex flex-col items-center max-[720px]:flex-row">
            <nav className="mt-[18px] flex flex-col items-center gap-3 max-[720px]:mt-0 max-[720px]:ml-2 max-[720px]:flex-row max-[720px]:gap-[3px]">
              <button
                className="grid size-12 place-items-center rounded-[17px] border-0 bg-[#f1f4f7] text-[#18202b] transition hover:-translate-y-px hover:bg-[#f1f4f7] max-[720px]:size-[46px]"
                aria-label="Visão geral"
              >
                <Icon name="grid" />
              </button>
              <button
                className="grid size-12 place-items-center rounded-[17px] border-0 bg-transparent text-[#9299a3] transition hover:-translate-y-px hover:bg-[#f1f4f7] hover:text-[#18202b] max-[720px]:size-[46px]"
                aria-label="Campanhas"
              >
                <Icon name="chart" />
              </button>
              <button
                className="grid size-12 place-items-center rounded-[17px] border-0 bg-transparent text-[#9299a3] transition hover:-translate-y-px hover:bg-[#f1f4f7] hover:text-[#18202b] max-[720px]:hidden max-[720px]:size-[46px]"
                aria-label="Pessoas"
              >
                <Icon name="users" />
              </button>
              <button
                className="grid size-12 place-items-center rounded-[17px] border-0 bg-transparent text-[#9299a3] transition hover:-translate-y-px hover:bg-[#f1f4f7] hover:text-[#18202b] max-[720px]:hidden max-[720px]:size-[46px]"
                aria-label="Proteção"
              >
                <Icon name="shield" />
              </button>
            </nav>
          </div>
          <div className="flex flex-col items-center gap-3 max-[720px]:hidden">
            <button
              className="mb-[18px] grid size-12 place-items-center rounded-[17px] border-0 bg-transparent text-[#9299a3] transition hover:-translate-y-px hover:bg-[#f1f4f7] hover:text-[#18202b]"
              aria-label="Configurações"
            >
              <Icon name="settings" />
            </button>
          </div>
        </div>
      </aside>

      <section className="flex h-[calc(100vh-112px)] min-h-0 min-w-0 flex-col overflow-hidden max-[1120px]:h-[calc(100vh-56px)] max-[720px]:h-auto">
        <header className="flex h-[var(--header-height)] flex-none items-center justify-between gap-5 rounded-[var(--radius-shell)] bg-[var(--surface)] px-8 py-3 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:mb-2.5 max-[720px]:h-[118px] max-[720px]:flex-col max-[720px]:items-start max-[720px]:rounded-[23px] max-[720px]:px-[22px] max-[720px]:py-5">
          <div>
            <h1 className="m-0 text-[clamp(18px,3vw,24px)] leading-[0.95] font-[680] tracking-[-0.065em]">
              Visão geral
            </h1>
          </div>
          <div className="flex items-center gap-2.5 max-[720px]:w-full max-[720px]:justify-between">
            <span className="mr-[7px] inline-flex items-center gap-2 text-[12px] text-[#69717d] max-[720px]:mr-auto">
              <span className="inline-block size-[7px] rounded-full bg-[#9fc52d] shadow-[0_0_0_4px_rgba(159,197,45,0.14)]" />
              {isSupabaseConfigured ? "Dados conectados" : "Modo demonstração"}
            </span>
            <button
              className="grid size-[38px] place-items-center rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] text-[#6f7883] transition hover:border-[#cbd0d5] hover:text-[#18202b]"
              aria-label="Atualizar dados"
              onClick={syncSelectedCampaign}
              disabled={syncing}
            >
              <Icon name="refresh" size={18} />
            </button>
            <button
              className="inline-flex min-h-[38px] items-center gap-[9px] rounded-[12px] border-0 bg-[#18202b] px-[15px] text-[12px] font-bold text-white shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors hover:bg-[#2d3a49] max-[720px]:px-[11px]"
              onClick={syncSelectedCampaign}
              disabled={!selectedCampaign || syncing}
            >
              <Icon name="refresh" size={16} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-3 flex items-center justify-between gap-[18px] rounded-[13px] bg-[#fff0e8] px-[14px] py-[11px] text-[12px] text-[#75402d]">
            <span>{error}</span>
            <button
              className="border-0 bg-transparent text-[11px] text-inherit underline"
              onClick={() => setError(null)}
            >
              Fechar
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#d9d9d9_transparent] [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0,#000_var(--edge-fade),#000_calc(100%_-_var(--edge-fade)),transparent_100%)] py-[14px] pr-2 [--edge-fade:14px] max-[720px]:overflow-visible max-[720px]:[mask-image:none] max-[720px]:p-0">
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(180px,0.62fr)_minmax(280px,0.82fr)] grid-rows-[minmax(330px,1.05fr)_minmax(320px,0.95fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.7fr)] max-[1120px]:grid-rows-[auto_auto_auto] max-[720px]:flex max-[720px]:flex-col">
            <article className="relative col-span-full grid min-w-0 grid-cols-[minmax(0,1fr)_280px] items-center gap-6 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] px-12 pt-[43px] pb-[31px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] before:absolute before:top-[-300px] before:right-[14%] before:size-[440px] before:rounded-full before:border before:border-[rgba(110,130,143,0.1)] before:shadow-[0_0_0_40px_rgba(110,130,143,0.025),0_0_0_80px_rgba(110,130,143,0.018)] before:content-[''] max-[1120px]:rounded-[45px] max-[720px]:flex max-[720px]:min-h-[530px] max-[720px]:flex-col max-[720px]:items-start max-[720px]:rounded-[23px] max-[720px]:px-[25px] max-[720px]:py-[30px]">
              <div className="relative z-[1] max-w-[600px]">
                <div className="mb-[23px] flex items-center gap-2 text-[11px] font-bold text-[#5e6974]">
                  <span className="h-px w-6 bg-[#557080]" /> Sinal de risco
                  humano
                </div>
                <h2 className="m-0 mb-[17px] text-[clamp(34px,4vw,62px)] leading-[0.93] font-[650] tracking-[-0.075em]">
                  O comportamento
                  <br />
                  <em className="text-[#7c8795] not-italic">
                    conta a história.
                  </em>
                </h2>
                <p className="mb-7 max-w-[380px] text-[13px] leading-[1.55] text-[#7b838d]">
                  Leitura consolidada da campanha selecionada e dos sinais que
                  pedem atenção.
                </p>
                <label className="flex w-[min(330px,100%)] flex-col gap-[7px] text-[10px] font-bold tracking-[0.12em] text-[#6f7882] uppercase">
                  Campanha analisada
                  <select
                    className="min-h-[39px] rounded-[11px] border border-[rgba(114,127,137,0.18)] bg-[rgba(255,255,255,0.58)] px-3 text-[12px] font-bold tracking-normal text-[#18202b] normal-case outline-none focus:border-[#7d92a0] focus:ring-[3px] focus:ring-[rgba(125,146,160,0.12)]"
                    value={selectedCampaign?.id ?? ""}
                    onChange={(event) =>
                      setSelectedId(Number(event.target.value))
                    }
                    disabled={!campaigns.length}
                  >
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="relative z-[1] flex flex-col items-center justify-center gap-4 max-[720px]:mt-2.5 max-[720px]:self-center">
                <div
                  className="grid size-[170px] rotate-[-34deg] place-items-center rounded-full [background:conic-gradient(#7892a0_var(--score),rgba(120,146,160,0.12)_0)]"
                  style={
                    {
                      "--score": `${pct(opened, total)}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="flex size-[137px] rotate-[34deg] flex-col items-center justify-center rounded-full bg-white">
                    <strong className="text-[37px] leading-none tracking-[-0.08em]">
                      {pct(opened, total)}%
                    </strong>
                    <span className="text-[10px] text-[#87919a]">abertura</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] tracking-[0.12em] text-[#87919a] uppercase">
                    Campanha {selectedCampaign?.id ?? "—"}
                  </span>
                  <strong className="text-[12px]">
                    {selectedCampaign
                      ? statusLabel(selectedCampaign.status)
                      : "Sem dados"}
                  </strong>
                  <span className="text-[10px] text-[#87919a]">
                    Atualizada {formatDate(selectedCampaign?.synced_at ?? null)}
                  </span>
                </div>
              </div>
              <div className="absolute right-7 bottom-[25px] flex items-center gap-[9px] text-[10px] tracking-[0.08em] text-[#929aa2] uppercase max-[720px]:static max-[720px]:mt-auto max-[720px]:justify-end max-[720px]:self-stretch">
                <span>HRM</span>
                <strong className="text-[10px] text-[#5e6974]">
                  {selectedCampaign
                    ? "Leitura operacional"
                    : "Aguardando dados"}
                </strong>
                <span className="grid size-[29px] place-items-center rounded-full border border-[rgba(85,108,121,0.2)] text-[#556c79]">
                  <Icon name="arrow" size={18} />
                </span>
              </div>
            </article>

            <article className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    CAMPANHAS
                  </p>
                  <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
                    Desempenho recente
                  </h3>
                </div>
                <Link
                  href={`/campaigns/${selectedCampaign?.id ?? 5345}`}
                  className="inline-flex items-center gap-[5px] text-[11px] text-[#818995] hover:text-[#18202b]"
                >
                  Ver tudo <Icon name="arrow" size={15} />
                </Link>
              </div>
              <div
                className="flex flex-1 items-end gap-[clamp(12px,2vw,24px)] border-b border-[#e9ebec] px-3 pt-6"
                aria-label="Taxa de abertura por campanha"
              >
                {campaignBars.map((campaign, index) => (
                  <div
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[9px]"
                    key={campaign.id}
                  >
                    <div className="-mb-1 text-[11px] font-extrabold text-[#637887]">
                      {campaign.rate}%
                    </div>
                    <div className="flex h-[66%] w-[min(44px,100%)] items-end overflow-hidden rounded-[9px_9px_0_0] bg-[#eef0f1]">
                      <div
                        className={`min-h-[7px] w-full rounded-[9px_9px_0_0] transition-[height] duration-500 ease-in-out ${index === 0 ? "bg-[#7d9aaa]" : "bg-[#a8bfd1]"}`}
                        style={{ height: `${Math.max(campaign.rate, 5)}%` }}
                      />
                    </div>
                    <span className="max-w-[70px] overflow-hidden text-[9px] text-ellipsis whitespace-nowrap text-[#9ba2a9]">
                      {campaign.name.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-[15px] flex justify-between gap-3 text-[10px] text-[#9ba2a9]">
                <span className="inline-flex items-center gap-[7px] text-[#65717b]">
                  <i className="size-1.5 rounded-full bg-[#7d9aaa]" />
                  Abertura
                </span>
                <span>Base: {total} pessoas</span>
              </div>
            </article>

            <div className="grid min-h-0 grid-rows-2 gap-[var(--cards-gap)] max-[1120px]:col-span-full max-[720px]:min-h-[260px]">
              <article className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
                <span className="relative z-[1] text-[11px] font-bold text-[#63778b]">
                  Cliques
                </span>
                <strong className="relative z-[1] mt-2.5 text-[58px] leading-[0.85] font-[630] tracking-[-0.1em]">
                  {clicked}
                </strong>
                <span className="relative z-[1] text-[10px] text-[#8091a1]">
                  {pct(clicked, total)}% da campanha
                </span>
                <div className="absolute -right-12 -bottom-[67px] size-[165px] rounded-full border-[20px] border-[rgba(72,125,255,0.09)]">
                  <span className="absolute inset-[26px] rounded-full border border-[rgba(72,125,255,0.2)]" />
                </div>
              </article>
              <article className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
                <span className="relative z-[1] text-[11px] font-bold text-[#63778b]">
                  Reportes
                </span>
                <strong className="relative z-[1] mt-2.5 text-[58px] leading-[0.85] font-[630] tracking-[-0.1em]">
                  {reported}
                </strong>
                <span className="relative z-[1] text-[10px] text-[#8091a1]">
                  {pct(reported, delivered)}% dos entregues
                </span>
                <div className="absolute right-[22px] bottom-7 flex h-[46px] items-end gap-1 opacity-50">
                  {[17, 28, 20, 39, 31].map((height, index) => (
                    <span
                      key={index}
                      className="w-[5px] rounded-[5px] bg-[#ca8667]"
                      style={{ height }}
                    />
                  ))}
                </div>
              </article>
            </div>

            <article className="min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:col-span-full max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    RISCO HUMANO
                  </p>
                  <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
                    Leitura da campanha
                  </h3>
                </div>
                <span className="grid size-[33px] place-items-center rounded-[11px] bg-[rgba(255,255,255,0.5)] text-[#607268]">
                  <Icon name="shield" size={18} />
                </span>
              </div>
              <div className="my-[29px] flex items-baseline gap-2.5">
                <strong className="text-[58px] leading-[0.8] font-[620] tracking-[-0.1em]">
                  {clicked + reported}
                </strong>
                <span className="text-[11px] text-[#7d8b80]">
                  sinais de atenção
                </span>
              </div>
              <div className="flex flex-col gap-[18px] text-[10px] text-[#748177]">
                {[
                  [
                    "Entregues",
                    `${delivered}/${total}`,
                    pct(delivered, total),
                    "#7c9a7f",
                  ],
                  [
                    "Abertura",
                    `${opened}/${total}`,
                    pct(opened, total),
                    "#5d7161",
                  ],
                  [
                    "Dados enviados",
                    `${stats.submitted_data ?? 0}`,
                    pct(Number(stats.submitted_data ?? 0), total),
                    "#d09b6d",
                  ],
                ].map(([label, value, width, color]) => (
                  <div
                    className="grid grid-cols-[1fr_auto] gap-[7px]"
                    key={label}
                  >
                    <span>{label}</span>
                    <strong className="text-[10px] text-[#4e5d53]">
                      {value}
                    </strong>
                    <div className="col-span-full h-[5px] overflow-hidden rounded-md bg-[rgba(98,125,107,0.14)]">
                      <i
                        className="block h-full rounded-[inherit]"
                        style={{
                          width: `${width}%`,
                          backgroundColor: String(color),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-[25px] flex items-center gap-[9px] border-t border-[rgba(98,125,107,0.13)] pt-[17px]">
                <span className="grid size-[19px] flex-none place-items-center rounded-full bg-[#6c836e] text-[11px] font-extrabold text-white">
                  !
                </span>
                <p className="m-0 text-[10px] leading-[1.35] text-[#7d8b80]">
                  Use os eventos para investigar a linha do tempo individual.
                </p>
              </div>
            </article>

            <article className="col-span-2 min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:col-span-full max-[1120px]:rounded-[45px] max-[720px]:col-span-1 max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    EVENTOS RECENTES
                  </p>
                  <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
                    Atividade
                  </h3>
                </div>
                <span className="text-[10px] text-[#a0a7ad]">
                  {events.length || (isSupabaseConfigured ? 0 : 4)} eventos
                </span>
              </div>
              <div className="mt-[17px]">
                {(isSupabaseConfigured
                  ? events
                  : [
                      {
                        id: 1,
                        event_type: "Email Opened",
                        occurred_at: "2026-08-10T12:43:33Z",
                      },
                      {
                        id: 2,
                        event_type: "Clicked Link",
                        occurred_at: "2026-08-07T20:27:00Z",
                      },
                      {
                        id: 3,
                        event_type: "Email Reported",
                        occurred_at: "2026-08-07T20:23:48Z",
                      },
                    ]
                ).map((event, index) => (
                  <div
                    className="grid grid-cols-[10px_1fr_15px] items-center gap-[11px] border-b border-[#eff0f0] py-[14px] last:border-0"
                    key={event.id}
                  >
                    <span
                      className={`size-[7px] rounded-full shadow-[0_0_0_4px_#edf2f3] ${index === 1 ? "bg-[#e0a17d] shadow-[0_0_0_4px_#fbefe9]" : index === 2 ? "bg-[#9dbd47] shadow-[0_0_0_4px_#f0f6dd]" : "bg-[#b5c5cc]"}`}
                    />
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <strong className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#4f5963]">
                        {event.event_type ?? "Evento registrado"}
                      </strong>
                      <span className="flex-none text-[10px] text-[#a5abb1]">
                        {formatDate(event.occurred_at)}
                      </span>
                    </div>
                    <Icon name="arrow" size={15} />
                  </div>
                ))}
                {!isSupabaseConfigured && (
                  <div className="mt-3 inline-block rounded-md bg-[#fff7ef] px-2 py-[5px] text-[9px] text-[#9a7b5e]">
                    Dados de demonstração
                  </div>
                )}
                {isSupabaseConfigured && !events.length && !loading && (
                  <div className="py-[25px] text-[11px] text-[#9aa1a7]">
                    Nenhum evento retornado para esta campanha.
                  </div>
                )}
              </div>
            </article>

            <article className="col-span-full min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-[25px] shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                    VISÃO DE CAMPANHAS
                  </p>
                  <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
                    Todas as campanhas
                  </h3>
                  <p className="mt-2 text-[11px] text-[#8b949d]">
                    Ranking por quantidade de pessoas incluídas em cada
                    campanha.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] text-[#89939c]">
                  <span className="rounded-full bg-[#f4f6f7] px-3 py-1.5">
                    {campaignSummary.length} campanhas
                  </span>
                  {campaignSummary[0] && (
                    <span className="rounded-full bg-[#edf2f3] px-3 py-1.5 text-[#5f7681]">
                      Maior alcance: {campaignSummary[0].name}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 max-[720px]:grid-cols-2">
                {[
                  ["Campanhas", campaignSummary.length],
                  ["Pessoas", overviewTotals.people],
                  ["Entregues", overviewTotals.delivered],
                  [
                    "Abertura",
                    `${pct(overviewTotals.opened, overviewTotals.people)}%`,
                  ],
                ].map(([label, value]) => (
                  <div
                    className="rounded-[16px] bg-[#f7f8f8] px-4 py-3"
                    key={String(label)}
                  >
                    <span className="block text-[10px] text-[#8b949d]">
                      {label}
                    </span>
                    <strong className="mt-1 block text-[21px] leading-none tracking-[-0.06em] text-[#18202b]">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-x-auto rounded-[18px] border border-[#edf0f1]">
                <table
                  className="w-full min-w-[820px] border-collapse text-left"
                  aria-label="Resumo de todas as campanhas"
                >
                  <thead>
                    <tr className="border-b border-[#edf0f1] bg-[#fafbfb] text-[10px] tracking-[0.1em] text-[#9299a2] uppercase">
                      <th className="w-[48px] px-4 py-3 font-extrabold">#</th>
                      <th className="px-4 py-3 font-extrabold">Campanha</th>
                      <th className="px-4 py-3 font-extrabold">Pessoas</th>
                      <th className="px-4 py-3 font-extrabold">Entregues</th>
                      <th className="px-4 py-3 font-extrabold">Abertura</th>
                      <th className="px-4 py-3 font-extrabold">Cliques</th>
                      <th className="px-4 py-3 font-extrabold">Reportes</th>
                      <th className="px-4 py-3 font-extrabold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignSummary.map((campaign, index) => (
                      <tr
                        className="border-b border-[#f0f1f2] text-[11px] text-[#69737d] last:border-0 hover:bg-[#fcfdfd]"
                        key={campaign.id}
                      >
                        <td className="px-4 py-3.5 font-bold text-[#9aa3aa]">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            className="flex min-w-0 items-center gap-3 hover:text-[#18202b]"
                            href={`/campaigns/${campaign.id}`}
                          >
                            <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-[#18202b] text-[11px] font-bold text-white">
                              {campaign.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <strong className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#35414d]">
                                {campaign.name}
                              </strong>
                              <span className="mt-0.5 text-[10px] text-[#a0a7ad]">
                                ID {campaign.id}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <strong className="text-[14px] text-[#18202b]">
                            {campaign.people}
                          </strong>
                          {index === 0 && (
                            <span className="ml-2 rounded-full bg-[#edf2f3] px-2 py-1 text-[9px] font-bold text-[#5f7681]">
                              maior alcance
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {campaign.deliveredPeople}/{campaign.people}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#5d7161]">
                          {campaign.openRate}%
                        </td>
                        <td className="px-4 py-3.5">
                          {campaign.clickedPeople}
                        </td>
                        <td className="px-4 py-3.5">
                          {campaign.reportedPeople}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(campaign.status)}`}
                          >
                            {statusLabel(campaign.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!campaignSummary.length && (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-[11px] text-[#9aa1a7]"
                          colSpan={8}
                        >
                          {loading
                            ? "Carregando campanhas…"
                            : "Nenhuma campanha encontrada."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </div>

        <footer className="hidden">
          <span>
            <i />
            Sistema operacional
          </span>
          <span>
            {selectedCampaign
              ? `Última coleta: ${formatDate(selectedCampaign.synced_at)}`
              : "Nenhuma coleta realizada"}
          </span>
          <span>
            BEEPHISH LENS <b>©</b>
          </span>
        </footer>
      </section>
    </main>
  );
}
