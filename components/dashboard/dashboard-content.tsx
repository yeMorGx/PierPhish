import { CampaignOpeningsCard } from "@/components/dashboard/campaign-openings-card";
import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { InvestigationCard } from "@/components/dashboard/investigation-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { RiskCard } from "@/components/dashboard/risk-card";
import type {
  Campaign,
  CampaignBar,
  CampaignSummary,
  EventRow,
  OverviewTotals,
} from "@/components/dashboard/types";

type DashboardContentProps = {
  campaignBars: CampaignBar[];
  campaigns: Campaign[];
  campaignSummary: CampaignSummary[];
  displayedEvents: EventRow[];
  loading: boolean;
  onSelectedChange: (id: number) => void;
  selectedCampaignId: number | null;
  totals: OverviewTotals;
};

export function DashboardContent({
  campaignBars,
  campaigns,
  campaignSummary,
  displayedEvents,
  loading,
  onSelectedChange,
  selectedCampaignId,
  totals,
}: DashboardContentProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(180px,0.62fr)_minmax(280px,0.82fr)] grid-rows-[minmax(330px,1.05fr)_minmax(320px,0.95fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.7fr)] max-[1120px]:grid-rows-[auto_auto_auto] max-[720px]:flex max-[720px]:flex-col">
      <OverviewHero
        activeCampaigns={campaignSummary.filter((campaign) => campaign.status === "In progress").length}
        latestSync={campaigns.reduce<string | null>((latest, campaign) => {
          if (!campaign.synced_at) return latest;
          if (!latest || Date.parse(campaign.synced_at) > Date.parse(latest)) return campaign.synced_at;
          return latest;
        }, null)}
        totals={totals}
      />
      <CampaignOpeningsCard campaigns={campaignBars} total={totals.people} />
      <div className="grid min-h-0 grid-rows-2 gap-[var(--cards-gap)] max-[1120px]:col-span-full max-[720px]:min-h-[260px]">
        <MetricCard label="Cliques" value={totals.clicked} helper={`${totals.people ? Math.round((totals.clicked / totals.people) * 100) : 0}% do total consolidado`} tone="blue" />
        <MetricCard label="Reportes" value={totals.reported} helper={`${totals.delivered ? Math.round((totals.reported / totals.delivered) * 100) : 0}% dos entregues consolidados`} tone="orange" />
      </div>
      <RiskCard clicked={totals.clicked} delivered={totals.delivered} opened={totals.opened} reported={totals.reported} submitted={totals.submitted} total={totals.people} />
      <InvestigationCard campaigns={campaigns} events={displayedEvents} loading={loading} onSelectedChange={onSelectedChange} selectedCampaignId={selectedCampaignId} />
      <CampaignOverviewCard campaigns={campaignSummary} totals={totals} />
    </div>
  );
}
