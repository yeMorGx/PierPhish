import type { Campaign, EventRow } from "@/components/dashboard/types";

export const demoCampaigns: Campaign[] = [
  {
    id: 5345,
    name: "Amazon — Cupom de desconto",
    status: "In progress",
    launch_date: "2026-08-07T11:01:00Z",
    synced_at: "2026-09-02T15:14:59Z",
    stats: {
      total: 11,
      sent: 11,
      delivered: 10,
      opened: 7,
      clicked: 2,
      submitted_data: 0,
      email_reported: 5,
      error: 0,
    },
  },
  {
    id: 5349,
    name: "Caju",
    status: "In progress",
    launch_date: "2026-08-07T11:00:00Z",
    synced_at: "2026-09-02T15:14:20Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 0,
      submitted_data: 0,
      email_reported: 0,
      error: 0,
    },
  },
  {
    id: 5052,
    name: "Teste anexo",
    status: "Completed",
    launch_date: "2026-07-18T10:00:00Z",
    synced_at: "2026-09-01T10:20:00Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 1,
      submitted_data: 0,
      email_reported: 0,
      error: 0,
    },
  },
  {
    id: 2581,
    name: "Facebook",
    status: "Completed",
    launch_date: "2025-11-04T18:55:00Z",
    synced_at: "2026-08-30T09:14:00Z",
    stats: {
      total: 2,
      sent: 2,
      delivered: 2,
      opened: 2,
      clicked: 2,
      submitted_data: 2,
      email_reported: 0,
      error: 0,
    },
  },
];

export const demoEventsByCampaign: Record<number, EventRow[]> = {
  5345: [
    { id: 1, event_type: "Email Opened", occurred_at: "2026-08-10T12:43:33Z" },
    { id: 2, event_type: "Clicked Link", occurred_at: "2026-08-07T20:27:00Z" },
    {
      id: 3,
      event_type: "Email Reported",
      occurred_at: "2026-08-07T20:23:48Z",
    },
  ],
  5349: [
    { id: 4, event_type: "Email Opened", occurred_at: "2026-08-08T11:18:00Z" },
  ],
  5052: [
    { id: 5, event_type: "Email Opened", occurred_at: "2026-07-19T14:05:00Z" },
    { id: 6, event_type: "Clicked Link", occurred_at: "2026-07-19T14:08:00Z" },
  ],
  2581: [
    { id: 7, event_type: "Clicked Link", occurred_at: "2025-11-05T09:12:00Z" },
    {
      id: 8,
      event_type: "Dados enviados",
      occurred_at: "2025-11-05T09:14:00Z",
    },
  ],
};
