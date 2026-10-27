import type {
  OverviewTotals,
  CampaignSummary,
} from "@/components/dashboard/types";
import { clickRateLevel, rawClickRate } from "@/lib/campaigns/metrics";

const maturityBands = [
  { tone: "excellent", label: "Excelente / maduro", range: "Até 3%" },
  { tone: "good", label: "Bom", range: "> 3% a 5%" },
  { tone: "acceptable", label: "Aceitável", range: "> 5% a 10%" },
  { tone: "warning", label: "Alerta", range: "> 10% a 15%" },
  { tone: "critical", label: "Crítico", range: "> 15%" },
] as const;

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});
const countFormatter = new Intl.NumberFormat("pt-BR");

export function HeroMaturity({
  totals,
  campaigns,
}: {
  totals: OverviewTotals;
  campaigns: CampaignSummary[];
}) {
  const dataAvailable = campaigns.every(
    (campaign) =>
      typeof campaign.stats.clicked === "number" &&
      Number.isFinite(campaign.stats.clicked) &&
      campaign.stats.clicked >= 0,
  );
  const base = totals.delivered || totals.people;
  const hasBase = totals.campaigns > 0 && base > 0;
  const valid =
    Number.isFinite(base) &&
    Number.isFinite(totals.clicked) &&
    totals.clicked >= 0 &&
    totals.clicked <= base;
  const available = hasBase && valid && dataAvailable;
  const rate = rawClickRate(totals.clicked, totals.delivered, totals.people);
  const level = available ? clickRateLevel(rate) : null;

  return (
    <section
      className="hero-maturity"
      aria-label="Maturidade das campanhas selecionadas"
    >
      <div className="hero-maturity-heading">
        <span>Maturidade</span>
        <strong>
          {level?.label ??
            (hasBase ? "Confira os dados" : "Sem base para classificar")}
        </strong>
      </div>
      {available && (
        <p className="hero-maturity-rate">
          {percentFormatter.format(rate)}% <span>de cliques</span>
        </p>
      )}
      <p className="hero-maturity-base">
        {available
          ? `${countFormatter.format(totals.clicked)} cliques em ${countFormatter.format(base)} ${totals.delivered ? "entregas" : "participações"}.`
          : hasBase && !dataAvailable
            ? "Os dados de cliques ainda não estão completos. Sincronize as campanhas."
            : hasBase
              ? "A contagem de cliques é incompatível com a base. Sincronize as campanhas."
              : "Sincronize campanhas com destinatários para consultar a maturidade."}
      </p>
      <details className="hero-maturity-criteria">
        <summary>Como a maturidade é calculada</summary>
        <div>
          <p>
            Cliques ÷ {totals.delivered ? "entregas" : "participações"} × 100.
            Quanto menor a taxa, melhor a classificação.
          </p>
          <ul aria-label="Faixas de maturidade">
            {maturityBands.map((band) => (
              <li
                key={band.tone}
                aria-current={level?.tone === band.tone ? "step" : undefined}
              >
                <span>{band.label}</span>
                <strong>{band.range}</strong>
                {level?.tone === band.tone && <small>Faixa atual</small>}
              </li>
            ))}
          </ul>
          <p>
            Faixas definidas pela operação, considerando apenas a taxa de
            cliques. Campanhas de teste ficam fora do cálculo.
            {available && !totals.delivered
              ? " Sem entregas registradas, a base usada é o total de participações."
              : ""}
          </p>
        </div>
      </details>
    </section>
  );
}
