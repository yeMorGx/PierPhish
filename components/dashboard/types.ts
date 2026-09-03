export type Stats = {
  total?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  submitted_data?: number;
  email_reported?: number;
  error?: number;
};

export type Campaign = {
  id: number;
  name: string;
  status: string | null;
  launch_date: string | null;
  synced_at: string | null;
  stats: Stats;
};

export type Result = {
  beephish_id: string;
  status: string | null;
  reported: boolean;
  department: string | null;
  modified_date: string | null;
};

export type EventRow = {
  id: number;
  event_type: string | null;
  occurred_at: string | null;
};

export type CampaignSummary = Campaign & {
  people: number;
  sentPeople: number;
  deliveredPeople: number;
  openedPeople: number;
  clickedPeople: number;
  submittedPeople: number;
  reportedPeople: number;
  errorPeople: number;
  openRate: number;
};

export type CampaignBar = Campaign & { rate: number };

export type OverviewTotals = {
  campaigns: number;
  people: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  errors: number;
};
