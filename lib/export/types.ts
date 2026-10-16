export type SlideTemplate = "capa" | "metricas" | "campanhas";

export const MAX_EXPORT_CAMPAIGNS = 250;

export type SlideData = {
  template: SlideTemplate;
  fields: Record<string, string>;
  images?: Record<string, string>;
  tables?: Record<string, string[][]>;
};

export type ExportRequest = {
  title: string;
  slides: SlideData[];
};

export type CampaignExportSummary = {
  name: string;
  people: number;
  sentPeople: number;
  deliveredPeople: number;
  openedPeople: number;
  clickedPeople: number;
  reportedPeople: number;
};

export type CampaignExportTotals = {
  campaigns: number;
  people: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  reported: number;
};

export type BuildSlidesInput = {
  companyName: string;
  periodLabel: string;
  logoDataUrl?: string | null;
  campaigns: CampaignExportSummary[];
  totals: CampaignExportTotals;
};
