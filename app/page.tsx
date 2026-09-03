"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import type {
  Campaign,
  CampaignBar,
  CampaignSummary,
  EventRow,
} from "@/components/dashboard/types";
import { demoCampaigns, demoEventsByCampaign } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default function Home() {
  const router = useRouter();
  const { ready, signOut, user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [selectedId, setSelectedId] = useState(5345);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialSyncStartedRef = useRef(false);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedId) ??
    campaigns[0] ??
    null;

  const campaignBars = useMemo<CampaignBar[]>(
    () =>
      [...campaigns]
        .sort(
          (first, second) =>
            Number(second.stats.total ?? 0) - Number(first.stats.total ?? 0),
        )
        .map((campaign) => ({
          ...campaign,
          rate: pct(
            Number(campaign.stats.opened ?? 0),
            Number(campaign.stats.total ?? 0),
          ),
        })),
    [campaigns],
  );

  const campaignSummary = useMemo<CampaignSummary[]>(
    () =>
      [...campaigns]
        .map((campaign) => {
          const campaignStats = campaign.stats ?? {};
          const people = Number(campaignStats.total ?? 0);
          const deliveredPeople = Number(campaignStats.delivered ?? 0);
          const openedPeople = Number(campaignStats.opened ?? 0);
          const clickedPeople = Number(campaignStats.clicked ?? 0);
          const reportedPeople = Number(campaignStats.email_reported ?? 0);
          const sentPeople = Number(campaignStats.sent ?? people);
          const submittedPeople = Number(campaignStats.submitted_data ?? 0);
          const errorPeople = Number(campaignStats.error ?? 0);

          return {
            ...campaign,
            people,
            sentPeople,
            deliveredPeople,
            openedPeople,
            clickedPeople,
            submittedPeople,
            reportedPeople,
            errorPeople,
            openRate: pct(openedPeople, people),
          };
        })
        .sort(
          (first, second) =>
            second.people - first.people ||
            second.deliveredPeople - first.deliveredPeople,
        ),
    [campaigns],
  );

  const totals = useMemo(
    () =>
      campaignSummary.reduce(
        (current, campaign) => ({
          campaigns: current.campaigns + 1,
          people: current.people + campaign.people,
          sent: current.sent + campaign.sentPeople,
          delivered: current.delivered + campaign.deliveredPeople,
          opened: current.opened + campaign.openedPeople,
          clicked: current.clicked + campaign.clickedPeople,
          submitted: current.submitted + campaign.submittedPeople,
          reported: current.reported + campaign.reportedPeople,
          errors: current.errors + campaign.errorPeople,
        }),
        {
          campaigns: 0,
          people: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          submitted: 0,
          reported: 0,
          errors: 0,
        },
      ),
    [campaignSummary],
  );

  const latestSync = useMemo(
    () =>
      campaigns.reduce<string | null>((latest, campaign) => {
        if (!campaign.synced_at) return latest;
        if (!latest || Date.parse(campaign.synced_at) > Date.parse(latest))
          return campaign.synced_at;
        return latest;
      }, null),
    [campaigns],
  );

  const displayedEvents = isSupabaseConfigured
    ? events
    : (demoEventsByCampaign[selectedCampaign?.id ?? 0] ?? []);

  useEffect(() => {
    if (!ready) return;
    if (isSupabaseConfigured && !user) {
      router.replace("/login");
      return;
    }
    if (user) startInitialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, router, user]);

  useEffect(() => {
    if (supabase && user && selectedCampaign)
      void loadDetails(selectedCampaign.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user?.id]);

  async function loadCampaigns(showLoading = true) {
    if (!supabase) return;
    if (showLoading) setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("beephish_campaigns")
      .select("id,name,status,launch_date,synced_at,stats")
      .order("launch_date", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      if (showLoading) setLoading(false);
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
    if (showLoading) setLoading(false);
  }

  async function loadDetails(campaignId: number) {
    if (!supabase) return;
    const { data: nextEvents } = await supabase
      .from("beephish_events")
      .select("id,event_type,occurred_at")
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: false })
      .limit(8);
    setEvents((nextEvents ?? []) as EventRow[]);
  }

  function startInitialSync() {
    if (initialSyncStartedRef.current) return;
    initialSyncStartedRef.current = true;
    void (async () => {
      await loadCampaigns();
      await syncAllCampaigns();
    })();
  }

  async function syncAllCampaigns() {
    if (!supabase) return;
    setSyncing(true);
    setError(null);
    try {
      const { error: syncError } = await supabase.functions.invoke(
        "sync-beephish",
        { body: {} },
      );
      const syncMessage = syncError?.message ?? null;
      await loadCampaigns(false);
      if (syncMessage) setError(syncMessage);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setEvents([]);
    initialSyncStartedRef.current = false;
  }

  if (!ready || (isSupabaseConfigured && !user)) {
    return (
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="surface-card rounded-[var(--radius-card)] px-8 py-7 text-[12px] text-[#7c8795] shadow-[0_18px_50px_rgba(25,34,45,0.08)]">
          Abrindo o centro de risco…
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      activeSection="overview"
      selectedCampaignId={selectedCampaign?.id}
      title="Visão geral"
      headerAction={
        <button
          className="inline-flex min-h-[38px] items-center gap-[9px] rounded-[12px] border-0 bg-[#18202b] px-[15px] text-[12px] font-bold text-white shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors hover:bg-[#2d3a49] max-[720px]:px-[11px]"
          onClick={() => void syncAllCampaigns()}
          disabled={syncing}
          type="button"
        >
          <Icon name="refresh" size={16} />
          {syncing ? "Sincronizando…" : "Sincronizar tudo"}
        </button>
      }
    >
      {error && (
        <div className="mb-3 flex items-center justify-between gap-[18px] rounded-[13px] bg-[#fff0e8] px-[14px] py-[11px] text-[12px] text-[#75402d]">
          <span>{error}</span>
          <button
            className="border-0 bg-transparent text-[11px] text-inherit underline"
            onClick={() => setError(null)}
            type="button"
          >
            Fechar
          </button>
        </div>
      )}
      <DashboardContent
        campaignBars={campaignBars}
        campaigns={campaigns}
        campaignSummary={campaignSummary}
        displayedEvents={displayedEvents}
        loading={loading}
        onSelectedChange={setSelectedId}
        selectedCampaignId={selectedCampaign?.id ?? null}
        totals={totals}
      />
      <footer className="hidden">
        <span>
          Última sincronização: {latestSync ?? "Nenhuma coleta realizada"}
        </span>
        <span>BEEPHISH LENS · {user?.email ?? "DEMO"}</span>
      </footer>
    </DashboardShell>
  );
}
