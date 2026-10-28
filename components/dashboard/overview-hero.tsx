import { formatDate } from "@/lib/format";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { HeroMaturity } from "@/components/dashboard/hero-maturity";
import { ShaderBackground } from "@/components/ui/istanblue";
import type {
  OverviewTotals,
  CampaignSummary,
} from "@/components/dashboard/types";

type OverviewHeroProps = {
  activeCampaigns: number;
  latestSync: string | null;
  totals: OverviewTotals;
  campaigns: CampaignSummary[];
  failuresAvailable?: boolean;
};

export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
  campaigns,
  failuresAvailable = false,
}: OverviewHeroProps) {
  const hasCampaigns = campaigns.length > 0;
  const hasMetric = (field: "submitted_data" | "email_reported") =>
    hasCampaigns &&
    campaigns.every((campaign) => {
      const value = campaign.stats[field];
      return typeof value === "number" && Number.isFinite(value) && value >= 0;
    });
  const metrics = [
    { label: "Entregues", value: hasCampaigns ? totals.delivered : null },
    {
      label: "Falhas registradas",
      value: hasCampaigns && failuresAvailable ? totals.errors : null,
    },
    {
      label: "Dados enviados",
      value: hasMetric("submitted_data") ? totals.submitted : null,
    },
    {
      label: "Reportes",
      value: hasMetric("email_reported") ? totals.reported : null,
    },
  ];
  const priorities: Array<{
    field: "submittedPeople" | "clickedPeople" | "errorPeople";
    label: string;
    reason: string;
  }> = [
    {
      field: "submittedPeople",
      label: "Revisar envios de dados",
      reason: "Comece pela campanha com mais registros de envio de dados.",
    },
    {
      field: "clickedPeople",
      label: "Revisar cliques",
      reason: "Comece pela campanha com mais registros de clique.",
    },
    ...(failuresAvailable
      ? [
          {
            field: "errorPeople" as const,
            label: "Investigar falhas de entrega",
            reason: "Confira a campanha com mais falhas registradas.",
          },
        ]
      : []),
  ];
  let action = {
    href: "#campaign-overview",
    label: "Conferir campanhas",
    reason: "Consulte os resultados e os estados de entrega do filtro atual.",
  };
  for (const priority of priorities) {
    const candidate = [...campaigns].sort(
      (a, b) => b[priority.field] - a[priority.field] || b.id - a.id,
    )[0];
    if (candidate && candidate[priority.field] > 0) {
      action = {
        href: `/campaigns/${candidate.id}`,
        label: priority.label,
        reason: `${priority.reason} ${candidate.name}`,
      };
      break;
    }
  }
  return (
    <article className="surface-card overview-hero-card operational-hero">
      <div className="operational-hero-background" aria-hidden="true">
        <ShaderBackground />
      </div>
      <div className="operational-hero-content">
        <div className="operational-hero-main">
          <p className="operational-hero-eyebrow">PierSec / Visão geral</p>
          <h2>
            <AnimatedNumber value={totals.campaigns} />{" "}
            <span>{totals.campaigns === 1 ? "campanha" : "campanhas"}</span>
          </h2>
        </div>
        <HeroMaturity totals={totals} campaigns={campaigns} />
        <section
          className="operational-hero-summary"
          aria-label="Resumo de envio e risco"
        >
          <dl>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>
                  {metric.value === null ? (
                    <span aria-label="Dado não disponível">—</span>
                  ) : (
                    <AnimatedNumber value={metric.value} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Uma pessoa pode aparecer em mais de uma campanha. — indica dado não
            informado.
          </p>
        </section>
        {hasCampaigns && (
          <div className="operational-hero-action">
            <div>
              <strong>Próxima ação</strong>
              <p>{action.reason}</p>
            </div>
            <Link href={action.href}>
              {action.label}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        )}
        <div className="operational-hero-footer">
          <span>
            <strong>{activeCampaigns}</strong> em andamento
          </span>
          <span>
            {latestSync
              ? `Atualizado ${formatDate(latestSync)}`
              : "Aguardando sincronização"}
          </span>
        </div>
      </div>
    </article>
  );
}
