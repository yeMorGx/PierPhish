import { CompanySignalsChart } from "./company-signals-chart";
import { CampaignOpeningsCard } from "@/components/dashboard/campaign-openings-card";
import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { PeopleRankings } from "@/components/dashboard/people-rankings";
import type {
  Campaign,
  CampaignBar,
  CampaignParticipants,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { DashboardCompanyFilterOption } from "./dashboard-company-filter";

type DashboardContentProps = {
  companies: Pick<DashboardCompanyFilterOption, "id" | "name" | "logoUrl">[];
  selectedCompany?: Pick<
    DashboardCompanyFilterOption,
    "id" | "name" | "logoUrl"
  > | null;
  campaignBars: CampaignBar[];
  campaigns: Campaign[];
  campaignSummary: CampaignSummary[];
  participantsByCampaign: CampaignParticipants;
  participantsLoading: boolean;
  participantRankingsAvailable: boolean;
  failuresAvailable: boolean;
  tableCampaigns: CampaignSummary[];
  onMarkAsTest?: (campaign: Campaign, marked: boolean) => Promise<void>;
  totals: OverviewTotals;
};

export function DashboardContent({
  companies,
  selectedCompany,
  campaignBars,
  campaigns,
  campaignSummary,
  participantsByCampaign,
  participantsLoading,
  participantRankingsAvailable,
  failuresAvailable,
  tableCampaigns,
  onMarkAsTest,
  totals,
}: DashboardContentProps) {
  return (
    <div className="bento-dashboard grid grid-cols-[minmax(0,1.35fr)_minmax(180px,0.62fr)_minmax(280px,0.82fr)] gap-[var(--cards-gap)] max-[1120px]:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.7fr)] max-[1120px]:grid-rows-[auto_auto_auto] max-[720px]:flex max-[720px]:flex-col">
      <div className="dashboard-primary-column">
        <OverviewHero
          company={selectedCompany}
          failuresAvailable={failuresAvailable}
          campaigns={campaignSummary}
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
        <div className="dashboard-people-column">
          <PeopleRankings
            companies={companies}
            campaigns={campaignSummary}
            participantsByCampaign={participantsByCampaign}
            loading={participantsLoading}
            available={participantRankingsAvailable}
          />
        </div>
      </div>
      <div className="dashboard-secondary-column">
        <CampaignOpeningsCard
          campaigns={campaignBars}
          total={totals.delivered}
        />
        <CompanySignalsChart
          campaigns={campaignSummary}
          companies={companies}
        />
      </div>
      <CampaignOverviewCard
        companies={companies}
        campaigns={tableCampaigns}
        onMarkAsTest={onMarkAsTest}
        totals={totals}
        failuresAvailable={failuresAvailable}
      />
    </div>
  );
}
