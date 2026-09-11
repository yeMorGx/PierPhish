import Link from "next/link";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import type { OverviewTotals } from "@/components/dashboard/types";

type OverviewHeroProps = {
  activeCampaigns: number;
  latestSync: string | null;
  totals: OverviewTotals;
};
export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
}: OverviewHeroProps) {
  const rate = totals.people
    ? Math.round((totals.opened / totals.people) * 100)
    : 0;
  const journey = [
    ["Pessoas alcançadas", totals.people],
    ["Entregas", totals.delivered],
    ["Aberturas", totals.opened],
    ["Dados enviados", totals.submitted],
  ] as const;
  return (
    <section className="neo-overview" aria-label="Resumo da operação">
      <article className="neo-overview-headline">
        <div className="neo-overview-meta">
          <span className="neo-tag">CAMPANHAS DE PHISHING</span>
          <span>Atualizado {formatDate(latestSync)}</span>
        </div>
        <h2>
          O risco não
          <br />
          passa <em>batido.</em>
        </h2>
        <div className="neo-overview-bottom">
          <p>
            Da primeira entrega ao último clique.
            <br />
            Toda a operação, no mesmo lugar.
          </p>
          <Link href="#campaign-overview" className="neo-text-link">
            Explorar campanhas <Icon name="arrow" size={22} />
          </Link>
        </div>
      </article>
      <article className="neo-campaign-total">
        <span className="neo-stamp">
          EM OPERAÇÃO <Icon name="arrow" size={19} />
        </span>
        <strong>{totals.campaigns}</strong>
        <h3>
          Campanhas
          <br />
          no radar.
        </h3>
        <span className="neo-active-count">{activeCampaigns} em andamento</span>
      </article>
      <div className="neo-journey">
        {journey.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className="neo-opening-rate">
          <span>Taxa de abertura</span>
          <strong>
            {rate}
            <small>%</small>
          </strong>
          <div
            className="neo-meter"
            role="meter"
            aria-label="Taxa de abertura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rate}
          >
            <i style={{ width: `${rate}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
