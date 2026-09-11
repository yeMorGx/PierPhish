import { CampaignOpeningsCard } from "@/components/dashboard/campaign-openings-card";
import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { RiskCard } from "@/components/dashboard/risk-card";
import { SignalSummaryCard } from "@/components/dashboard/signal-summary-card";
import type {
  Campaign,
  CampaignBar,
  CampaignParticipants,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { PersonAvatarMap } from "@/lib/person-avatars";

type DashboardContentProps = {
  campaignBars: CampaignBar[];
  campaigns: Campaign[];
  personAvatars: PersonAvatarMap;
  participantsByCampaign: CampaignParticipants;
  campaignSummary: CampaignSummary[];
  totals: OverviewTotals;
};

export function DashboardContent({
  campaignBars,
  campaigns,
  personAvatars,
  participantsByCampaign,
  campaignSummary,
  totals,
}: DashboardContentProps) {
  return (
    <div className="bento-dashboard grid grid-cols-[minmax(0,1.35fr)_minmax(180px,0.62fr)_minmax(280px,0.82fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.7fr)] max-[1120px]:grid-rows-[auto_auto_auto] max-[720px]:flex max-[720px]:flex-col">
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
      <SignalSummaryCard
        clicked={totals.clicked}
        delivered={totals.delivered}
        people={totals.people}
        reported={totals.reported}
        submitted={totals.submitted}
      />
      <RiskCard
        clicked={totals.clicked}
        delivered={totals.delivered}
        opened={totals.opened}
        reported={totals.reported}
        submitted={totals.submitted}
        total={totals.people}
      />
      <CampaignOverviewCard
        campaigns={campaignSummary}
        personAvatars={personAvatars}
        participantsByCampaign={participantsByCampaign}
        totals={totals}
      />
    </div>
  );
}
