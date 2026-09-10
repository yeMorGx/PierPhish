import type {
  Campaign,
  CampaignBar,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { PresentationData } from "@/components/presentation/presentation-types";

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function buildPresentationData(campaigns: Campaign[]): PresentationData {
  const campaignBars = [...campaigns]
    .sort(
      (first, second) =>
        Number(second.stats.total ?? 0) - Number(first.stats.total ?? 0),
    )
    .map(
      (campaign): CampaignBar => ({
        ...campaign,
        rate: pct(
          Number(campaign.stats.opened ?? 0),
          Number(campaign.stats.total ?? 0),
        ),
      }),
    );

  const campaignSummary = [...campaigns]
    .map((campaign): CampaignSummary => {
      const stats = campaign.stats ?? {};
      const people = Number(stats.total ?? 0);
      const sentPeople = Number(stats.sent ?? people);
      const deliveredPeople = Number(stats.delivered ?? 0);
      const openedPeople = Number(stats.opened ?? 0);
      const clickedPeople = Number(stats.clicked ?? 0);
      const submittedPeople = Number(stats.submitted_data ?? 0);
      const reportedPeople = Number(stats.email_reported ?? 0);
      const errorPeople = Number(stats.error ?? 0);

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
    );

  const totals = campaignSummary.reduce<OverviewTotals>(
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

  const latestSync = campaigns.reduce<string | null>((latest, campaign) => {
    if (!campaign.synced_at) return latest;
    if (!latest || Date.parse(campaign.synced_at) > Date.parse(latest))
      return campaign.synced_at;
    return latest;
  }, null);

  return { campaignBars, campaignSummary, latestSync, totals };
}
