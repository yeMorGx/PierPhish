import type { OverviewTotals } from "@/components/dashboard/types";
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

export function MaturityCard({
  totals,
  dataAvailable = true,
}: {
  totals: OverviewTotals;
  dataAvailable?: boolean;
}) {
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
    <article
      className="surface-card maturity-card"
      aria-labelledby="maturity-title"
    >
      <div className="maturity-summary">
        <div>
          <h2 id="maturity-title">Maturidade</h2>
          <p>
            Classificação baseada na taxa de cliques das campanhas selecionadas.
          </p>
        </div>
        <div className="maturity-result">
          <strong>
            {level?.label ??
              (hasBase ? "Confira os dados" : "Sem base para classificar")}
          </strong>
          {available && (
            <span className="maturity-rate">
              {percentFormatter.format(rate)}
              <small>% de cliques</small>
            </span>
          )}
          <p>
            {available
              ? `${countFormatter.format(totals.clicked)} cliques em ${countFormatter.format(base)} ${totals.delivered ? "entregas" : "participações"}.`
              : hasBase && !dataAvailable
                ? "Os dados de cliques ainda não estão completos. Sincronize as campanhas."
                : hasBase
                  ? "A contagem de cliques é incompatível com a base. Sincronize as campanhas."
                  : "Sincronize campanhas com destinatários para consultar a maturidade."}
          </p>
        </div>
      </div>
      <ol
        className="maturity-bands"
        aria-label="Faixas de maturidade, da menor para a maior taxa de cliques"
      >
        {maturityBands.map((band) => (
          <li
            key={band.tone}
            aria-current={level?.tone === band.tone ? "step" : undefined}
          >
            <span>{band.range}</span>
            <strong>{band.label}</strong>
            {level?.tone === band.tone && <small>Faixa atual</small>}
          </li>
        ))}
      </ol>
      <p className="maturity-note">
        Quanto menor a taxa, melhor a classificação. Faixas definidas pela
        operação; campanhas de teste ficam fora do cálculo.
        {available && !totals.delivered
          ? " Sem entregas registradas, a base usada é o total de participações."
          : ""}
      </p>
    </article>
  );
}
