import { CampaignOpeningsCard } from "@/components/dashboard/campaign-openings-card";
import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { RiskCard } from "@/components/dashboard/risk-card";
import type {
  Campaign,
  CampaignBar,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";

type DashboardContentProps = {
  campaignBars: CampaignBar[];
  campaigns: Campaign[];
  campaignSummary: CampaignSummary[];
  totals: OverviewTotals;
};

export function DashboardContent({
  campaignBars,
  campaigns,
  campaignSummary,
  totals,
}: DashboardContentProps) {
  return (
    <div className="neo-dashboard-grid">
      <OverviewHero
        activeCampaigns={
          campaignSummary.filter(
            (campaign) => campaign.status === "In progress",
          ).length
        }
        latestSync={campaigns.reduce<string | null>((latest, campaign) => {
          if (!campaign.synced_at) return latest;
          if (!latest || Date.parse(campaign.synced_at) > Date.parse(latest))
            return campaign.synced_at;
          return latest;
        }, null)}
        totals={totals}
      />
      <CampaignOpeningsCard campaigns={campaignBars} total={totals.people} />
      <div className="neo-metric-stack">
        <MetricCard
          label="Cliques"
          value={totals.clicked}
          helper={`${totals.people ? Math.round((totals.clicked / totals.people) * 100) : 0}% do total consolidado`}
          tone="blue"
        />
        <MetricCard
          label="Reportes"
          value={totals.reported}
          helper={`${totals.delivered ? Math.round((totals.reported / totals.delivered) * 100) : 0}% dos entregues consolidados`}
          tone="orange"
        />
      </div>
      <RiskCard
        clicked={totals.clicked}
        delivered={totals.delivered}
        opened={totals.opened}
        reported={totals.reported}
        submitted={totals.submitted}
        total={totals.people}
      />
      <CampaignOverviewCard campaigns={campaignSummary} totals={totals} />
    </div>
  );
}
