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
};

export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
  campaigns,
}: OverviewHeroProps) {
  return (
    <article className="surface-card overview-hero-card operational-hero">
      <div className="operational-hero-background" aria-hidden="true">
        <ShaderBackground />
      </div>
      <div className="operational-hero-content">
        <p className="operational-hero-eyebrow">PierSec / Visão geral</p>
        <h2>
          <AnimatedNumber value={totals.campaigns} />{" "}
          <span>{totals.campaigns === 1 ? "campanha" : "campanhas"}</span>
        </h2>
        <HeroMaturity totals={totals} campaigns={campaigns} />
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
