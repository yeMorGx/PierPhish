import { CampaignOpeningsCard } from "@/components/dashboard/campaign-openings-card";
import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { RiskCard } from "@/components/dashboard/risk-card";
import type {
  PresentationData,
  PresentationSlideId,
} from "@/components/presentation/presentation-types";

type PresentationSlideProps = {
  data: PresentationData;
  slideId: PresentationSlideId;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function PresentationRiskSlide({ data }: { data: PresentationData }) {
  const highRisk = Math.min(
    data.totals.people,
    data.totals.clicked + data.totals.submitted,
  );
  const attention = Math.min(
    Math.max(data.totals.people - highRisk, 0),
    Math.max(data.totals.opened - highRisk, 0),
  );
  const lowRisk = Math.max(data.totals.people - highRisk - attention, 0);
  const signals = highRisk + attention;
  const levels = [
    {
      description: "Clicou ou enviou dados",
      label: "Risco alto",
      tone: "high",
      value: highRisk,
    },
    {
      description: "Abriu a mensagem",
      label: "Atenção",
      tone: "attention",
      value: attention,
    },
    {
      description: "Sem exposição crítica",
      label: "Baixo",
      tone: "low",
      value: lowRisk,
    },
  ] as const;

  return (
    <div className="presentation-slide-stack presentation-risk-stack">
      <article className="surface-card presentation-risk-hero">
        <div>
          <p className="presentation-eyebrow">CENTRO DE RISCO</p>
          <h2>
            Pessoas que pedem
            <br />
            atenção.
          </h2>
          <p>
            Uma leitura consolidada de todas as campanhas, com os sinais que
            ajudam a priorizar orientação e resposta.
          </p>
        </div>
        <div className="presentation-risk-hero-meta">
          <span>
            <strong>{data.totals.campaigns}</strong>campanhas analisadas
          </span>
          <span>
            <strong>{data.totals.people}</strong>pessoas consolidadas
          </span>
          <span>
            <strong>{signals}</strong>sinais prioritários
          </span>
        </div>
      </article>

      <div className="presentation-risk-metrics">
        <article className="surface-card presentation-risk-stat">
          <span>Pessoas analisadas</span>
          <strong>{data.totals.people}</strong>
          <small>em todas as campanhas</small>
        </article>
        <article className="surface-card presentation-risk-stat is-high">
          <span>Sinais críticos</span>
          <strong>{highRisk}</strong>
          <small>cliques ou dados enviados</small>
        </article>
        <article className="surface-card presentation-risk-stat is-attention">
          <span>Sinais de atenção</span>
          <strong>{attention}</strong>
          <small>abriu a mensagem</small>
        </article>
        <article className="surface-card presentation-risk-stat is-low">
          <span>Sem sinal crítico</span>
          <strong>{lowRisk}</strong>
          <small>estimativa da base sem sinais</small>
        </article>
      </div>

      <article className="surface-card presentation-risk-breakdown">
        <div className="presentation-section-heading">
          <div>
            <p className="presentation-eyebrow">LEITURA DO RISCO</p>
            <h3>O que cada nível significa</h3>
            <p>
              A classificação consolida os sinais observados em todas as
              campanhas sincronizadas.
            </p>
          </div>
          <span className="presentation-risk-score">
            {pct(signals, data.totals.people)}% da base com sinal
          </span>
        </div>
        <div className="presentation-risk-levels">
          {levels.map((level) => (
            <div className="presentation-risk-level" key={level.label}>
              <div className="presentation-risk-level-copy">
                <strong className={`is-${level.tone}`}>{level.label}</strong>
                <span>{level.description}</span>
              </div>
              <div className="presentation-risk-level-value">
                <b>{level.value}</b>
                <span>{pct(level.value, data.totals.people)}%</span>
              </div>
              <div className="presentation-risk-progress">
                <i
                  className={`is-${level.tone}`}
                  style={{ width: `${pct(level.value, data.totals.people)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

export function PresentationSlide({ data, slideId }: PresentationSlideProps) {
  if (slideId === "campaigns") {
    return (
      <div className="presentation-slide-stack">
        <CampaignOverviewCard
          campaigns={data.campaignSummary}
          totals={data.totals}
        />
      </div>
    );
  }

  if (slideId === "risk") return <PresentationRiskSlide data={data} />;

  return (
    <div className="presentation-slide-stack">
      <OverviewHero
        activeCampaigns={
          data.campaignSummary.filter(
            (campaign) => campaign.status === "In progress",
          ).length
        }
        latestSync={data.latestSync}
        totals={data.totals}
      />
      <div className="presentation-overview-grid">
        <CampaignOpeningsCard
          campaigns={data.campaignBars}
          total={data.totals.people}
        />
        <div className="presentation-metric-stack">
          <MetricCard
            helper={`${pct(data.totals.clicked, data.totals.people)}% do total consolidado`}
            label="Cliques"
            tone="blue"
            value={data.totals.clicked}
          />
          <MetricCard
            helper={`${pct(data.totals.reported, data.totals.delivered)}% dos entregues consolidados`}
            label="Reportes"
            tone="orange"
            value={data.totals.reported}
          />
        </div>
        <RiskCard
          clicked={data.totals.clicked}
          delivered={data.totals.delivered}
          opened={data.totals.opened}
          reported={data.totals.reported}
          submitted={data.totals.submitted}
          total={data.totals.people}
        />
      </div>
    </div>
  );
}
