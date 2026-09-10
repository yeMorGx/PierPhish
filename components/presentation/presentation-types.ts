import type {
  CampaignBar,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";

export type PresentationSlideId = "overview" | "campaigns" | "risk";

export type PresentationPreferences = {
  selectedSlides: PresentationSlideId[];
  scrollEnabled: boolean;
  scrollSpeed: "slow" | "medium" | "fast";
  slideDuration: 8 | 12 | 20;
  autoSync: boolean;
  syncInterval: 30 | 60 | 300;
};

export type PresentationData = {
  campaignBars: CampaignBar[];
  campaignSummary: CampaignSummary[];
  totals: OverviewTotals;
  latestSync: string | null;
};
