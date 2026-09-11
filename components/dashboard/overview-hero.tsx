import { formatDate } from "@/lib/format";
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
    ["Base total", totals.people, "100%"],
    ["Entregues", totals.delivered, `${pct(totals.delivered, totals.people)}%`],
    ["Aberturas", totals.opened, `${openingRate}%`],
    ["Cliques", totals.clicked, `${pct(totals.clicked, totals.people)}%`],
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
              {journey.map(([label, value, rate]) => (
                <div className="bento-journey-cell" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{rate} da base</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bento-hero-insight">
          <div className="bento-hero-insight-top">
            <span className="bento-hero-insight-label">Abertura consolidada</span>
            <span className="bento-hero-insight-badge">
              {activeCampaigns} em andamento
            </span>
          </div>

          <div>
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
              <strong>{openingRate}%</strong>
              <span>abertura</span>
            </div>
          </div>

          <p className="bento-hero-insight-footer">
            {totals.opened} de {totals.people} pessoas abriram a mensagem.
          </p>
        </div>
      </div>
    </article>
  );
}
