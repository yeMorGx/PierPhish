import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
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
  company?: { name: string; logoUrl: string | null } | null;
};

export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
  campaigns,
  failuresAvailable = false,
  company,
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
  return (
    <article className="surface-card overview-hero-card operational-hero">
      <div className="operational-hero-background" aria-hidden="true">
        <ShaderBackground />
      </div>
      <div className="operational-hero-content">
        <div className="operational-hero-main">
          {company !== undefined && (
            <div className="operational-hero-company">
              {company ? (
                <>
                  <Avatar className="hero-company-logo after:hidden">
                    {company.logoUrl && (
                      <AvatarImage src={company.logoUrl} alt="" />
                    )}
                    <AvatarFallback>
                      {company.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{company.name}</span>
                </>
              ) : (
                <span>Todas as empresas</span>
              )}
            </div>
          )}
          <p className="operational-hero-eyebrow">PierSec / Visão geral</p>
          <h2>
            <AnimatedNumber value={totals.campaigns} />{" "}
            <span>{totals.campaigns === 1 ? "campanha" : "campanhas"}</span>
          </h2>
        </div>
        <HeroMaturity totals={totals} campaigns={campaigns} />
        <footer className="operational-hero-footer">
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
          </section>
          <div className="operational-hero-status">
            <span>
              <strong>{activeCampaigns}</strong> em andamento
            </span>
            <span>
              {latestSync
                ? `Atualizado ${formatDate(latestSync)}`
                : "Aguardando sincronização"}
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}
