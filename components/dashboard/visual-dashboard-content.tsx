"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CampaignLogo,
  useCampaignLogos,
} from "@/components/campaigns/campaign-logo";
import {
  AnimatedTooltip,
  type AnimatedTooltipItem,
} from "@/components/ui/animated-tooltip";
import { Icon, type IconName } from "@/components/ui/icon";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { BentoDashboardGrid } from "@/components/dashboard/bento-dashboard-grid";
import type {
  CampaignBar,
  CampaignParticipants,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { PersonAvatarMap } from "@/lib/person-avatars";

type VisualDashboardContentProps = {
  campaignBars: CampaignBar[];
  campaignSummary: CampaignSummary[];
  personAvatars: PersonAvatarMap;
  participantsByCampaign: CampaignParticipants;
  totals: OverviewTotals;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function avatarUrl(
  name: string,
  index: number,
  avatar: string | null | undefined,
) {
  if (avatar) return avatar;
  const fills = ["#202831", "#66737b", "#9aa3a6", "#c9cfcc"];
  const fill = fills[index % fills.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="${fill}"/><text x="40" y="44" fill="#ffffff" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">${initials(name)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeTooltipPeople(
  campaignId: number,
  participants: CampaignParticipants[string],
  personAvatars: PersonAvatarMap,
): AnimatedTooltipItem[] {
  return participants.map((participant, index) => ({
    id: campaignId * 10 + index,
    name: participant.name,
    designation: participant.id.includes("@")
      ? participant.id
      : "Pessoa participante",
    image: avatarUrl(participant.name, index, personAvatars[participant.id]),
  }));
}

function PeopleStack({
  campaignId,
  peopleCount,
  participants,
  personAvatars,
}: {
  campaignId: number;
  peopleCount: number;
  participants: CampaignParticipants[string];
  personAvatars: PersonAvatarMap;
}) {
  const allPeople = makeTooltipPeople(campaignId, participants, personAvatars);
  const visiblePeople = allPeople.slice(0, 3);
  const remainingPeople = allPeople.slice(3);
  const remainingCount = Math.max(
    peopleCount - visiblePeople.length,
    remainingPeople.length,
    0,
  );

  return (
    <AnimatedTooltip
      className="visual-campaign-people"
      items={visiblePeople}
      numPeople={remainingCount}
      remainingItems={remainingPeople}
    />
  );
}

function Ring({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="visual-dashboard-ring">
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle
          className="visual-dashboard-ring-track"
          cx="52"
          cy="52"
          r="44"
        />
        <circle
          className="visual-dashboard-ring-value"
          cx="52"
          cy="52"
          r="44"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <strong>
        <AnimatedNumber value={value} suffix="%" />
      </strong>
    </div>
  );
}

function CampaignOpeningsChart({ campaigns }: { campaigns: CampaignBar[] }) {
  const data = campaigns.slice(0, 8).map((campaign) => ({
    name: campaign.name.split(" ").slice(0, 2).join(" "),
    rate: campaign.rate,
  }));

  return (
    <div
      className="visual-dashboard-recharts"
      aria-label="Abertura por campanha"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          margin={{ bottom: 0, left: -18, right: 8, top: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--line-soft)"
            strokeDasharray="2 4"
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            tick={{ fill: "var(--muted-soft)", fontSize: 9 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[0, 100]}
            tick={{ fill: "var(--muted-soft)", fontSize: 9 }}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              color: "var(--ink)",
              background: "var(--surface)",
              fontSize: 11,
            }}
            cursor={{ fill: "var(--surface-soft)" }}
            formatter={(value) => [`${value}%`, "Abertura"]}
          />
          <Bar
            dataKey="rate"
            fill="var(--accent)"
            maxBarSize={36}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VisualDashboardContent({
  campaignBars,
  campaignSummary,
  personAvatars,
  participantsByCampaign,
  totals,
}: VisualDashboardContentProps) {
  const openingRate = pct(totals.opened, totals.people);
  const deliveryRate = pct(totals.delivered, totals.people);
  const exposureRate = pct(
    totals.clicked + totals.submitted + totals.reported,
    totals.people,
  );
  const signals = totals.clicked + totals.submitted + totals.reported;
  const metrics: Array<{
    icon: IconName;
    label: string;
    value: number;
    suffix?: string;
  }> = [
    { icon: "grid", label: "campanhas", value: totals.campaigns },
    { icon: "users", label: "pessoas", value: totals.people },
    { icon: "chart", label: "entregues", value: totals.delivered },
    {
      icon: "chart",
      label: "taxa de cliques",
      value: totals.clickRate,
      suffix: "%",
    },
  ];

  const riskItems = [
    {
      label: "cliques",
      value: totals.clicked,
      width: pct(totals.clicked, totals.people),
    },
    {
      label: "dados",
      value: totals.submitted,
      width: pct(totals.submitted, totals.people),
    },
    {
      label: "reportes",
      value: totals.reported,
      width: pct(totals.reported, totals.delivered),
    },
  ];

  const campaignTiles = campaignSummary.slice(0, 5);
  const { logos } = useCampaignLogos();

  return (
    <BentoDashboardGrid>
      <section
        className="surface-card visual-dashboard-hero"
        data-widget-id="hero"
      >
        <div className="visual-dashboard-hero-main">
          <div className="visual-dashboard-topline">
            <span className="visual-dashboard-live" />
            <span className="visual-dashboard-overline">PierPhish</span>
          </div>
          <div className="visual-dashboard-primary-value">
            <strong>
              {openingRate}
              <sup>%</sup>
            </strong>
            <span>abertura</span>
          </div>
          <div
            aria-label="Taxa de abertura"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={openingRate}
            className="visual-dashboard-progress"
            role="progressbar"
          >
            <span style={{ width: `${openingRate}%` }} />
          </div>
          <div className="visual-dashboard-hero-meta">
            <span>
              {totals.opened}/{totals.people}
            </span>
            <span>{deliveryRate}% entregues</span>
          </div>
        </div>
        <div className="visual-dashboard-hero-insight">
          <div className="visual-dashboard-insight-top">
            <span className="visual-dashboard-insight-icon">
              <Icon name="chart" size={16} />
            </span>
            <span className="visual-dashboard-insight-pulse" />
          </div>
          <Ring value={openingRate} />
          <div className="visual-dashboard-insight-footer">
            <strong>{exposureRate}%</strong>
            <span>exposição</span>
          </div>
        </div>
      </section>

      <section
        className="visual-dashboard-metric-grid"
        aria-label="Resumo do dashboard"
        data-widget-id="metrics"
      >
        {metrics.map((metric) => (
          <article
            className="surface-card visual-dashboard-metric"
            key={metric.label}
          >
            <span className="visual-dashboard-metric-icon">
              <Icon name={metric.icon} size={15} />
            </span>
            <strong>
              <AnimatedNumber value={metric.value} suffix={metric.suffix} />
            </strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section
        className="surface-card visual-dashboard-chart-card"
        data-widget-id="chart"
      >
        <div className="visual-dashboard-card-head">
          <div>
            <span className="visual-dashboard-overline">Campanhas</span>
            <strong>{campaignBars.length}</strong>
          </div>
          <Icon name="chart" size={18} />
        </div>
        <CampaignOpeningsChart campaigns={campaignBars} />
      </section>

      <section
        className="surface-card visual-dashboard-risk-card"
        data-widget-id="risk"
      >
        <div className="visual-dashboard-card-head">
          <div>
            <span className="visual-dashboard-overline">Risco humano</span>
            <strong>
              <AnimatedNumber value={signals} />
            </strong>
          </div>
          <span className="visual-dashboard-risk-icon">
            <Icon name="shield" size={17} />
          </span>
        </div>
        <div className="visual-dashboard-risk-list">
          {riskItems.map((item) => (
            <div className="visual-dashboard-risk-row" key={item.label}>
              <span>{item.label}</span>
              <strong>
                <AnimatedNumber value={item.value} />
              </strong>
              <i>
                <b style={{ width: `${Math.min(item.width, 100)}%` }} />
              </i>
            </div>
          ))}
        </div>
      </section>

      <section
        className="surface-card visual-dashboard-campaigns-card"
        id="campaign-overview"
        data-widget-id="campaigns"
      >
        <div className="visual-dashboard-card-head visual-dashboard-campaigns-head">
          <div>
            <span className="visual-dashboard-overline">
              Visão de campanhas
            </span>
            <strong>{totals.campaigns}</strong>
          </div>
          <Link href="#campaign-overview" aria-label="Ver todas as campanhas">
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="visual-dashboard-campaign-tiles">
          {campaignTiles.map((campaign) => (
            <Link
              className="visual-dashboard-campaign-tile"
              href={`/campaigns/${campaign.id}`}
              key={campaign.id}
              aria-label={`${campaign.name}, ${campaign.openRate}% de abertura`}
            >
              <div className="visual-dashboard-campaign-tile-top">
                <CampaignLogo
                  fallback={campaign.name.charAt(0).toUpperCase()}
                  src={logos[String(campaign.id)]}
                />
                <strong>
                  <AnimatedNumber value={campaign.openRate} suffix="%" />
                </strong>
              </div>
              <span>{campaign.name.split(" ").slice(0, 3).join(" ")}</span>
              <i>
                <b style={{ width: `${Math.max(campaign.openRate, 4)}%` }} />
              </i>
              <PeopleStack
                campaignId={campaign.id}
                peopleCount={campaign.people}
                participants={participantsByCampaign[String(campaign.id)] ?? []}
                personAvatars={personAvatars}
              />
            </Link>
          ))}
          {!campaignTiles.length && (
            <div className="visual-dashboard-empty">—</div>
          )}
        </div>
      </section>
    </BentoDashboardGrid>
  );
}
