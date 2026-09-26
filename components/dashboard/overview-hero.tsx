import { formatDate } from "@/lib/format";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { OverviewTotals } from "@/components/dashboard/types";

type OverviewHeroProps = {
  activeCampaigns: number;
  latestSync: string | null;
  totals: OverviewTotals;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
}: OverviewHeroProps) {
  const openingRate = pct(totals.opened, totals.people);
  const journey = [
    { label: "Base total", value: totals.people, rate: 100 },
    {
      label: "Entregues",
      value: totals.delivered,
      rate: pct(totals.delivered, totals.people),
    },
    { label: "Aberturas", value: totals.opened, rate: openingRate },
    { label: "Cliques", value: totals.clicked, rate: totals.clickRate },
  ] as const;
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference - (openingRate / 100) * circumference;

  return (
    <article className="surface-card overview-hero-card bento-hero-card relative col-span-full min-w-0 overflow-hidden rounded-[var(--radius-card)] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px]">
      <div className="bento-hero-grid">
        <div className="bento-hero-copy">
          <div>
            <p className="bento-eyebrow">PierPhish / visão operacional</p>
            <h2 className="bento-hero-title">
              {totals.campaigns || "Todas as"} campanhas.
              <br />
              <span>Clareza para agir.</span>
            </h2>
            <p className="bento-hero-description">
              Alcance, entregas e sinais de exposição em uma leitura única da
              operação.
            </p>
          </div>

          <div>
            <div className="bento-hero-meta">
              <span className="bento-hero-status">
                <i />
                {activeCampaigns} campanhas em andamento
              </span>
              <span className="bento-hero-updated">
                Atualizado {formatDate(latestSync)}
              </span>
            </div>

            <div className="bento-journey" aria-label="Jornada consolidada">
              {journey.map(({ label, value, rate }) => (
                <div className="bento-journey-cell" key={label}>
                  <span>{label}</span>
                  <strong>
                    <AnimatedNumber value={value} />
                  </strong>
                  <small>
                    <AnimatedNumber value={rate} suffix="%" /> da base
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bento-hero-insight">
          <div className="bento-hero-insight-top">
            <span className="bento-hero-insight-label">
              Abertura consolidada
            </span>
            <span className="bento-hero-insight-badge">
              {activeCampaigns} em andamento
            </span>
          </div>

          <div className="bento-ring-wrap">
            <svg
              className="bento-ring"
              viewBox="0 0 120 120"
              role="img"
              aria-label={`${openingRate}% de abertura`}
            >
              <circle className="bento-ring-track" cx="60" cy="60" r="48" />
              <circle
                className="bento-ring-value"
                cx="60"
                cy="60"
                r="48"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="bento-ring-label">
              <strong>
                <AnimatedNumber value={openingRate} suffix="%" />
              </strong>
              <span>abertura</span>
            </div>
          </div>

          <p className="bento-hero-insight-footer">
            <AnimatedNumber value={totals.opened} /> aberturas em{" "}
            <AnimatedNumber value={totals.people} /> participações.
          </p>
        </div>
      </div>
    </article>
  );
}
