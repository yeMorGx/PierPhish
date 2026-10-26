"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  DashboardDateFilter,
  formatDashboardPeriodLabel,
  getDashboardDateRange,
  type DashboardPeriod,
} from "@/components/dashboard/dashboard-date-filter";
import { ExportCanvaButton } from "@/components/export/ExportCanvaButton";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { VisualDashboardContent } from "@/components/dashboard/visual-dashboard-content";
import { useTheme } from "@/components/theme/theme-provider";
import { Icon } from "@/components/ui/icon";
import {
  DashboardCompanyFilter,
  type DashboardCompanyFilterOption,
} from "@/components/dashboard/dashboard-company-filter";
import type {
  Campaign,
  CampaignBar,
  CampaignParticipants,
  CampaignSummary,
} from "@/components/dashboard/types";
import { buildSlidesFromSiteData } from "@/lib/export/build-slides";
import {
  isDeliveryFailure,
  resolveCampaignFailureCount,
  type DeliveryResultSummary,
} from "@/lib/campaigns/delivery-statistics";
import type { WorkspaceRole } from "@/lib/company-data";
import { demoCampaigns } from "@/lib/demo-data";
import { demoCompanies, readLocalCompanies } from "@/lib/company-data";
import { readPersonAvatars, type PersonAvatarMap } from "@/lib/person-avatars";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  databaseWorkspaceId,
  hasBeephishData,
  useActiveWorkspaceId,
} from "@/lib/use-active-workspace";
import { readActiveWorkspaceId } from "@/lib/company-data";
import type { CalendarDate } from "@internationalized/date";
import {
  loadWorkspaceExcludedEmails,
  normalizeWorkspaceEmail,
} from "@/lib/workspace-exclusions";

type RawParticipant = {
  campaign_id: number;
  beephish_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  reported: boolean | null;
  status: string | null;
};

type AdminCompaniesResponse = {
  companies?: Array<{
    id: string;
    workspaceId: string;
    name: string;
    logoUrl: string | null;
    status: "active" | "inactive";
  }>;
};

const demoParticipantsByCampaign: CampaignParticipants = {
  "5345": [
    { id: "ana.souza@empresa.com", name: "Ana Souza" },
    { id: "carlos.lima@empresa.com", name: "Carlos Lima" },
    { id: "juliana.alves@empresa.com", name: "Juliana Alves" },
    { id: "marina.costa@empresa.com", name: "Marina Costa" },
  ],
  "5349": [
    { id: "paula.nunes@empresa.com", name: "Paula Nunes" },
    { id: "rafael.dias@empresa.com", name: "Rafael Dias" },
  ],
  "5052": [
    { id: "bianca.reis@empresa.com", name: "Bianca Reis" },
    { id: "caio.martins@empresa.com", name: "Caio Martins" },
  ],
  "2581": [
    { id: "lucas.prado@empresa.com", name: "Lucas Prado" },
    { id: "fernanda.alves@empresa.com", name: "Fernanda Alves" },
  ],
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function startedInRange(
  campaign: Campaign,
  range: ReturnType<typeof getDashboardDateRange>,
) {
  if (!range) return true;
  if (!campaign.launch_date) return false;
  const startedAt = Date.parse(campaign.launch_date);
  return startedAt >= range.start.getTime() && startedAt < range.end.getTime();
}

function isGlobalAdmin(user: ReturnType<typeof useAuth>["user"]) {
  if (!isSupabaseConfigured) return true;
  if (user?.email?.toLowerCase() === "admin@teste.com") return true;
  const metadata = user?.app_metadata as
    { role?: unknown; is_admin?: unknown } | undefined;
  return (
    metadata?.is_admin === true ||
    metadata?.role === "admin" ||
    metadata?.role === "owner" ||
    metadata?.role === "super_admin"
  );
}

export default function Home() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const { preferences: themePreferences } = useTheme();
  const activeWorkspaceId = useActiveWorkspaceId();
  const workspaceHasBeephishData = hasBeephishData(activeWorkspaceId);
  const [activeWorkspaceRole, setActiveWorkspaceRole] =
    useState<WorkspaceRole | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [participantsByCampaign, setParticipantsByCampaign] =
    useState<CampaignParticipants>(
      isSupabaseConfigured ? {} : demoParticipantsByCampaign,
    );
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [deliveryResults, setDeliveryResults] = useState<
    Record<string, DeliveryResultSummary>
  >({});
  const [personAvatars, setPersonAvatars] = useState<PersonAvatarMap>({});
  const [selectedId, setSelectedId] = useState(5345);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<
    AdminCompaniesResponse["companies"]
  >(
    isSupabaseConfigured
      ? []
      : demoCompanies.map((company) => ({
          id: company.id,
          workspaceId: company.workspaceId,
          name: company.name,
          logoUrl: company.logoUrl,
          status: company.status,
        })),
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("all");
  const [referenceDate, setReferenceDate] = useState<CalendarDate | null>(null);
  const initialSyncStartedRef = useRef(false);
  const canSyncWorkspace =
    isGlobalAdmin(user) ||
    activeWorkspaceRole === "owner" ||
    activeWorkspaceRole === "admin" ||
    activeWorkspaceRole === "analyst";

  const dateRange = useMemo(
    () => getDashboardDateRange(selectedPeriod, referenceDate),
    [selectedPeriod, referenceDate],
  );
  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        if (
          selectedCompanyId !== "all" &&
          campaign.company_id !== selectedCompanyId
        )
          return false;
        return startedInRange(campaign, dateRange);
      }),
    [campaigns, dateRange, selectedCompanyId],
  );

  const companyFilters = useMemo<DashboardCompanyFilterOption[]>(
    () =>
      (companies ?? [])
        .filter((company) => company.status === "active")
        .filter((company) => company.workspaceId === activeWorkspaceId)
        .map((company) => ({
          id: company.id,
          name: company.name,
          logoUrl: company.logoUrl,
          campaignCount: campaigns.filter(
            (campaign) =>
              campaign.company_id === company.id &&
              startedInRange(campaign, dateRange),
          ).length,
        })),
    [activeWorkspaceId, campaigns, companies, dateRange],
  );

  const campaignBars = useMemo<CampaignBar[]>(
    () =>
      [...filteredCampaigns]
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
    [filteredCampaigns],
  );

  const campaignSummary = useMemo<CampaignSummary[]>(
    () =>
      [...filteredCampaigns]
        .map((campaign) => {
          const campaignStats = campaign.stats ?? {};
          const people = Number(campaignStats.total ?? 0);
          const deliveredPeople = Number(campaignStats.delivered ?? 0);
          const openedPeople = Number(campaignStats.opened ?? 0);
          const clickedPeople = Number(campaignStats.clicked ?? 0);
          const reportedPeople = Number(campaignStats.email_reported ?? 0);
          const sentPeople = Number(campaignStats.sent ?? people);
          const submittedPeople = Number(campaignStats.submitted_data ?? 0);
          const errorPeople =
            resolveCampaignFailureCount(
              campaignStats,
              deliveryResults[String(campaign.id)],
            ) ?? 0;

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
            clickRate: pct(clickedPeople, deliveredPeople || people),
          };
        })
        .sort(
          (first, second) =>
            second.people - first.people ||
            second.deliveredPeople - first.deliveredPeople,
        ),
    [filteredCampaigns, deliveryResults],
  );

  const totals = useMemo(
    () =>
      (() => {
        const summary = campaignSummary.reduce(
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
        );
        return {
          ...summary,
          clickRate: pct(summary.clicked, summary.delivered || summary.people),
        };
      })(),
    [campaignSummary],
  );

  const failuresAvailable = campaignSummary.every(
    (campaign) =>
      resolveCampaignFailureCount(
        campaign.stats ?? {},
        deliveryResults[String(campaign.id)],
      ) !== null,
  );

  const exportCompanyName =
    selectedCompanyId === "all"
      ? "Todas as empresas"
      : (companyFilters.find((company) => company.id === selectedCompanyId)
          ?.name ?? "Empresa selecionada");
  const exportPeriodLabel = formatDashboardPeriodLabel(
    selectedPeriod,
    referenceDate,
  );
  const selectedCompanyLogo = companyFilters.find(
    (company) => company.id === selectedCompanyId,
  )?.logoUrl;
  const exportRequest = useMemo(
    () =>
      buildSlidesFromSiteData({
        companyName: exportCompanyName,
        periodLabel: exportPeriodLabel,
        logoDataUrl:
          selectedCompanyId !== "all" &&
          selectedCompanyLogo &&
          /^data:image\/(png|jpeg);base64,/i.test(selectedCompanyLogo)
            ? selectedCompanyLogo
            : null,
        campaigns: campaignSummary.map((campaign) => ({
          name: campaign.name,
          people: campaign.people,
          sentPeople: campaign.sentPeople,
          deliveredPeople: campaign.deliveredPeople,
          openedPeople: campaign.openedPeople,
          clickedPeople: campaign.clickedPeople,
          reportedPeople: campaign.reportedPeople,
        })),
        totals: {
          campaigns: totals.campaigns,
          people: totals.people,
          sent: totals.sent,
          delivered: totals.delivered,
          opened: totals.opened,
          clicked: totals.clicked,
          reported: totals.reported,
        },
      }),
    [
      campaignSummary,
      exportCompanyName,
      exportPeriodLabel,
      selectedCompanyId,
      selectedCompanyLogo,
      totals,
    ],
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

  useEffect(() => {
    const refreshPersonAvatars = () => {
      setPersonAvatars(readPersonAvatars());
    };

    refreshPersonAvatars();
    window.addEventListener("storage", refreshPersonAvatars);
    window.addEventListener(
      "pierphish-person-avatars-change",
      refreshPersonAvatars,
    );

    return () => {
      window.removeEventListener("storage", refreshPersonAvatars);
      window.removeEventListener(
        "pierphish-person-avatars-change",
        refreshPersonAvatars,
      );
    };
  }, []);

  useEffect(() => {
    initialSyncStartedRef.current = false;
    setSelectedId(0);
    setSelectedCompanyId("all");
    setSyncing(false);
    setError(null);
    if (!workspaceHasBeephishData) {
      setCampaigns([]);
      setParticipantsByCampaign({});
      return;
    }
    if (!isSupabaseConfigured) {
      setCampaigns(demoCampaigns);
      setParticipantsByCampaign(demoParticipantsByCampaign);
      setCompanies(
        readLocalCompanies()
          .filter((company) => company.workspaceId === activeWorkspaceId)
          .map((company) => ({
            id: company.id,
            workspaceId: company.workspaceId,
            name: company.name,
            logoUrl: company.logoUrl,
            status: company.status,
          })),
      );
    }
  }, [activeWorkspaceId, workspaceHasBeephishData]);

  useEffect(() => {
    if (!isSupabaseConfigured || !ready || !user || !supabase) {
      setActiveWorkspaceRole(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const response = await fetch("/api/workspaces", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json().catch(() => ({}))) as {
        workspaces?: Array<{ id: string; role?: WorkspaceRole }>;
      };
      if (cancelled) return;
      const activeWorkspace = (body.workspaces ?? []).find(
        (workspace) => workspace.id === activeWorkspaceId,
      );
      setActiveWorkspaceRole(activeWorkspace?.role ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, ready, user?.id]);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;
    void loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, ready, user?.id]);

  useEffect(() => {
    if (!ready) return;
    if (isSupabaseConfigured && !user) {
      router.replace("/login");
      return;
    }
    if (workspaceHasBeephishData && user) startInitialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeWorkspaceId,
    canSyncWorkspace,
    ready,
    router,
    user,
    workspaceHasBeephishData,
  ]);

  async function loadCampaigns() {
    if (!supabase || !workspaceHasBeephishData) {
      setParticipantsLoading(false);
      return;
    }
    const requestedWorkspaceId = activeWorkspaceId;
    const requestedDatabaseWorkspaceId =
      databaseWorkspaceId(requestedWorkspaceId);
    setParticipantsLoading(true);
    setDeliveryResults({});
    setError(null);

    const { data, error: queryError } = await supabase
      .from("beephish_campaigns")
      .select("id,name,status,launch_date,synced_at,stats,company_id")
      .eq("workspace_id", requestedDatabaseWorkspaceId)
      .order("launch_date", { ascending: false });

    if (readActiveWorkspaceId() !== requestedWorkspaceId) return;
    if (queryError) {
      setError(queryError.message);
      setParticipantsLoading(false);
      return;
    }

    const nextCampaigns = (data ?? []) as Campaign[];
    setCampaigns(nextCampaigns);
    const avatars = readPersonAvatars();
    setPersonAvatars(avatars);
    const excludedEmails = await loadWorkspaceExcludedEmails(
      requestedDatabaseWorkspaceId,
    );
    if (readActiveWorkspaceId() !== requestedWorkspaceId) return;
    const nextParticipants: CampaignParticipants = {};
    const nextDeliveryResults: Record<string, DeliveryResultSummary> = {};
    for (const campaign of nextCampaigns)
      nextDeliveryResults[String(campaign.id)] = { total: 0, failed: 0 };
    if (nextCampaigns.length) {
      const pageSize = 1000;
      const participantRows: RawParticipant[] = [];
      for (let start = 0; ; start += pageSize) {
        const { data: participantData, error: participantError } =
          await supabase
            .from("beephish_results")
            .select(
              "campaign_id,beephish_id,first_name,last_name,email,reported,status,modified_date",
            )
            .eq("workspace_id", requestedDatabaseWorkspaceId)
            .in(
              "campaign_id",
              nextCampaigns.map((campaign) => campaign.id),
            )
            .order("modified_date", { ascending: false })
            .order("campaign_id", { ascending: true })
            .order("beephish_id", { ascending: true })
            .range(start, start + pageSize - 1);
        if (readActiveWorkspaceId() !== requestedWorkspaceId) return;
        if (participantError) {
          setError(participantError.message);
          setParticipantsByCampaign({});
          setParticipantsLoading(false);
          return;
        }
        const pageRows = (participantData ?? []) as RawParticipant[];
        participantRows.push(...pageRows);
        if (pageRows.length < pageSize) break;
      }

      for (const participant of participantRows) {
        if (excludedEmails.has(normalizeWorkspaceEmail(participant.email))) {
          continue;
        }
        const name =
          [participant.first_name, participant.last_name]
            .filter(Boolean)
            .join(" ") || "Nome não informado";
        const personId =
          participant.email?.trim().toLowerCase() ||
          participant.beephish_id ||
          `${participant.campaign_id}:${name.toLowerCase()}`;
        const key = String(participant.campaign_id);
        nextDeliveryResults[key].total += 1;
        if (isDeliveryFailure(participant.status))
          nextDeliveryResults[key].failed += 1;
        const current = nextParticipants[key] ?? [];
        if (!current.some((participant) => participant.id === personId)) {
          nextParticipants[key] = [
            ...current,
            { id: personId, name, reported: Boolean(participant.reported) },
          ];
        }
      }
    }
    if (readActiveWorkspaceId() !== requestedWorkspaceId) return;
    setParticipantsByCampaign(nextParticipants);
    setDeliveryResults(nextDeliveryResults);
    setParticipantsLoading(false);
    if (
      nextCampaigns.length &&
      !nextCampaigns.some((campaign) => campaign.id === selectedId)
    )
      setSelectedId(nextCampaigns[0].id);
  }

  async function loadCompanies() {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;

    const response = await fetch("/api/admin/companies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;
    const body = (await response
      .json()
      .catch(() => ({}))) as AdminCompaniesResponse;
    setCompanies(
      (body.companies ?? []).filter(
        (company) =>
          company.workspaceId === activeWorkspaceId &&
          company.status === "active",
      ),
    );
  }

  function startInitialSync() {
    if (initialSyncStartedRef.current) return;
    void (async () => {
      await loadCampaigns();
      if (!canSyncWorkspace || initialSyncStartedRef.current) return;
      initialSyncStartedRef.current = true;
      await syncAllCampaigns();
    })();
  }

  async function syncAllCampaigns() {
    if (!supabase || !workspaceHasBeephishData || !canSyncWorkspace) return;
    setSyncing(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Sua sessão expirou. Entre novamente para sincronizar.");
        return;
      }
      const response = await fetch("/api/sync-beephish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: databaseWorkspaceId(activeWorkspaceId),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      await loadCampaigns();
      if (!response.ok) setError(body.error ?? "Não foi possível sincronizar.");
    } finally {
      setSyncing(false);
    }
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
      title="Visão geral"
      headerAction={
        <button
          aria-label={
            !workspaceHasBeephishData
              ? "Workspace sem conexão BeePhish"
              : !canSyncWorkspace
                ? "Sincronização restrita ao administrador do workspace"
                : syncing
                  ? "Sincronizando dados"
                  : "Sincronizar tudo"
          }
          className="header-sync-button inline-flex min-h-[38px] items-center gap-[9px] rounded-[12px] border-0 px-[15px] text-[12px] font-bold shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors max-[720px]:px-[11px]"
          onClick={() => void syncAllCampaigns()}
          disabled={syncing || !workspaceHasBeephishData || !canSyncWorkspace}
          title={
            workspaceHasBeephishData
              ? undefined
              : "Adicione uma conexão BeePhish em Empresas para carregar dados."
          }
          type="button"
        >
          <Icon name="refresh" size={16} />
          <span
            className={
              themePreferences.dashboardMode === "visual" ? "sr-only" : ""
            }
          >
            {syncing ? "Sincronizando…" : "Sincronizar tudo"}
          </span>
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
      <DashboardCompanyFilter
        companies={companyFilters}
        selectedCompanyId={selectedCompanyId}
        onChange={setSelectedCompanyId}
        showLayoutControl={themePreferences.dashboardMode === "visual"}
      >
        <DashboardDateFilter
          period={selectedPeriod}
          reference={referenceDate}
          onPeriodChange={setSelectedPeriod}
          onReferenceChange={setReferenceDate}
          campaignCount={filteredCampaigns.length}
        />
        <ExportCanvaButton
          workspaceId={activeWorkspaceId}
          companyName={exportCompanyName}
          periodLabel={exportPeriodLabel}
          campaignCount={totals.campaigns}
          request={exportRequest}
          campaigns={campaignSummary}
          totals={totals}
        />
      </DashboardCompanyFilter>
      {themePreferences.dashboardMode === "visual" ? (
        <div data-tour="dashboard-content">
          <VisualDashboardContent
            campaignBars={campaignBars}
            campaignSummary={campaignSummary}
            personAvatars={personAvatars}
            participantsByCampaign={participantsByCampaign}
            totals={totals}
          />
        </div>
      ) : (
        <div data-tour="dashboard-content">
          <DashboardContent
            companies={(companies ?? []).filter(
              (company) => company.workspaceId === activeWorkspaceId,
            )}
            campaignBars={campaignBars}
            campaigns={filteredCampaigns}
            campaignSummary={campaignSummary}
            participantsByCampaign={participantsByCampaign}
            participantsLoading={participantsLoading}
            participantRankingsAvailable={
              isSupabaseConfigured && workspaceHasBeephishData
            }
            failuresAvailable={failuresAvailable}
            totals={totals}
          />
        </div>
      )}
      <footer className="hidden">
        <span>
          Última sincronização: {latestSync ?? "Nenhuma coleta realizada"}
        </span>
        <span>PIERPHISH · {user?.email ?? "DEMO"}</span>
      </footer>
    </DashboardShell>
  );
}
