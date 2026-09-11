"use client";

import Link from "next/link";
import {
  CampaignLogo,
  useCampaignLogos,
} from "@/components/campaigns/campaign-logo";
import {
  AnimatedTooltip,
  type AnimatedTooltipItem,
} from "@/components/ui/animated-tooltip";
import { Icon, type IconName } from "@/components/ui/icon";
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
      <strong>{value}%</strong>
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
    value: string | number;
  }> = [
    { icon: "grid", label: "campanhas", value: totals.campaigns },
    { icon: "users", label: "pessoas", value: totals.people },
    { icon: "chart", label: "entregues", value: `${totals.delivered}` },
    { icon: "shield", label: "sinais", value: signals },
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
    <div className="visual-dashboard">
      <section className="surface-card visual-dashboard-hero">
        <div className="visual-dashboard-hero-main">
          <div className="visual-dashboard-topline">
            <span className="visual-dashboard-mark">P</span>
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
          <div className="visual-dashboard-progress" aria-hidden="true">
            <i style={{ width: `${openingRate}%` }} />
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
      >
        {metrics.map((metric) => (
          <article
            className="surface-card visual-dashboard-metric"
            key={metric.label}
          >
            <span className="visual-dashboard-metric-icon">
              <Icon name={metric.icon} size={15} />
            </span>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="surface-card visual-dashboard-chart-card">
        <div className="visual-dashboard-card-head">
          <div>
            <span className="visual-dashboard-overline">Campanhas</span>
            <strong>{campaignBars.length}</strong>
          </div>
          <Icon name="chart" size={18} />
        </div>
        <div
          className="visual-dashboard-chart"
          aria-label="Abertura por campanha"
        >
          {campaignBars.slice(0, 8).map((campaign, index) => (
            <Link
              className="visual-dashboard-chart-column"
              href={`/campaigns/${campaign.id}`}
              key={campaign.id}
              title={`${campaign.name}: ${campaign.rate}%`}
              aria-label={`${campaign.name}, ${campaign.rate}% de abertura`}
            >
              <span>{campaign.rate}%</span>
              <i
                style={{ height: `${Math.max(campaign.rate, 7)}%` }}
                className={index === 0 ? "is-featured" : ""}
              />
              <small>{campaign.name.split(" ").slice(0, 2).join(" ")}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-card visual-dashboard-risk-card">
        <div className="visual-dashboard-card-head">
          <div>
            <span className="visual-dashboard-overline">Risco humano</span>
            <strong>{signals}</strong>
          </div>
          <span className="visual-dashboard-risk-icon">
            <Icon name="shield" size={17} />
          </span>
        </div>
        <div className="visual-dashboard-risk-list">
          {riskItems.map((item) => (
            <div className="visual-dashboard-risk-row" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
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
                <strong>{campaign.openRate}%</strong>
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
    </div>
  );
}
