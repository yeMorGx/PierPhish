"use client";

import { useState } from "react";
import Link from "next/link";
import type { CampaignSummary } from "./types";
import { campaignIsTest } from "@/lib/campaigns/metrics";

const metrics = [
  { key: "deliveredPeople", label: "Entregues" },
  { key: "openedPeople", label: "Abertos" },
  { key: "clickedPeople", label: "Cliques" },
  { key: "submittedPeople", label: "Dados enviados" },
  { key: "reportedPeople", label: "Reportes" },
] as const;
type Metric = (typeof metrics)[number]["key"];
const number = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const date = (value: string | null) => {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export function CampaignComparison({
  campaigns,
}: {
  campaigns: CampaignSummary[];
}) {
  const eligible = campaigns
    .filter((campaign) => !campaignIsTest(campaign))
    .sort((a, b) => date(b.launch_date) - date(a.launch_date) || b.id - a.id);
  const scope = eligible.map((campaign) => campaign.id).join(",");
  const [selection, setSelection] = useState<{
    scope: string;
    ids: number[];
  } | null>(null);
  const [metric, setMetric] = useState<Metric>("clickedPeople");
  const ids =
    selection?.scope === scope
      ? selection.ids
      : eligible.slice(0, 3).map((campaign) => campaign.id);
  const selected = eligible
    .filter((campaign) => ids.includes(campaign.id))
    .reverse();
  const label = metrics.find((item) => item.key === metric)!.label;
  const rows = selected.map((campaign) => {
    const base =
      metric === "deliveredPeople"
        ? campaign.people
        : campaign.deliveredPeople || campaign.people;
    return {
      campaign,
      base,
      count: campaign[metric],
      rate: base > 0 ? (campaign[metric] / base) * 100 : null,
    };
  });

  return (
    <section
      className="surface-card campaign-comparison"
      aria-labelledby="campaign-comparison-title"
    >
      <header>
        <div>
          <h3 id="campaign-comparison-title">Comparação entre campanhas</h3>
          <p>
            Compare até três campanhas do filtro, da mais antiga para a mais
            recente.
          </p>
        </div>
        <details className="campaign-comparison-picker">
          <summary>Selecionar campanhas ({ids.length}/3)</summary>
          <div role="group" aria-label="Campanhas para comparar">
            {eligible.map((campaign) => (
              <label key={campaign.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(campaign.id)}
                  disabled={ids.length >= 3 && !ids.includes(campaign.id)}
                  onChange={(event) =>
                    setSelection({
                      scope,
                      ids: event.target.checked
                        ? [...ids, campaign.id].slice(0, 3)
                        : ids.filter((id) => id !== campaign.id),
                    })
                  }
                />
                <span>{campaign.name}</span>
              </label>
            ))}
            {!eligible.length && (
              <p>Nenhuma campanha disponível neste filtro.</p>
            )}
          </div>
        </details>
      </header>
      <div
        className="campaign-comparison-metrics"
        role="group"
        aria-label="Métrica da comparação"
      >
        {metrics.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={metric === item.key}
            onClick={() => setMetric(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="campaign-comparison-rows" aria-live="polite">
        {rows.map(({ campaign, base, count, rate }, index) => {
          const previous = rows[index - 1]?.rate;
          const difference =
            rate !== null && previous != null ? rate - previous : null;
          return (
            <article key={campaign.id}>
              <div className="campaign-comparison-identity">
                <Link href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                <span>
                  {date(campaign.launch_date)
                    ? new Date(campaign.launch_date!).toLocaleDateString(
                        "pt-BR",
                      )
                    : "Início não informado"}
                </span>
              </div>
              <div className="campaign-comparison-bar" aria-hidden="true">
                <span
                  style={{ width: `${Math.min(100, Math.max(0, rate ?? 0))}%` }}
                />
              </div>
              <div className="campaign-comparison-value">
                <strong>{rate === null ? "—" : `${number(rate)}%`}</strong>
                <span>
                  {number(count)} / {number(base)}
                </span>
              </div>
              <span className="campaign-comparison-delta">
                {difference === null
                  ? "Referência"
                  : `${difference > 0 ? "+" : ""}${number(difference)} p.p.`}
              </span>
            </article>
          );
        })}
        {!rows.length && (
          <p role="status">
            Selecione uma campanha para visualizar a comparação.
          </p>
        )}
      </div>
      <footer>
        {label}:{" "}
        {metric === "deliveredPeople"
          ? "entregues ÷ participações"
          : "registros ÷ entregues; sem entregas registradas, a base é participações"}
        . Variação em pontos percentuais em relação à campanha anterior
        selecionada. Campanhas de teste ficam fora.
      </footer>
    </section>
  );
}
