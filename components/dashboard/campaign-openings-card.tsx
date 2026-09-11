import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CampaignBar } from "@/components/dashboard/types";

export function CampaignOpeningsCard({
  campaigns,
  total,
}: {
  campaigns: CampaignBar[];
  total: number;
}) {
  const ranked = [...campaigns].sort((a, b) => b.rate - a.rate).slice(0, 5);
  return (
    <article className="surface-card neo-ranking">
      <div className="neo-card-heading">
        <div>
          <span className="neo-eyebrow">QUEM CHAMOU ATENÇÃO</span>
          <h3>Abertura por campanha</h3>
        </div>
        <Icon name="chart" size={28} />
      </div>
      <ol className="neo-ranking-list">
        {ranked.map((campaign, index) => (
          <li key={campaign.id}>
            <Link href={`/campaigns/${campaign.id}`}>
              <span className="neo-rank-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="neo-rank-detail">
                <span>{campaign.name}</span>
                <span className="neo-rank-track">
                  <i style={{ width: `${campaign.rate}%` }} />
                </span>
              </span>
              <strong>{campaign.rate}%</strong>
            </Link>
          </li>
        ))}
      </ol>
      {!ranked.length && (
        <p className="neo-empty">
          As campanhas aparecerão aqui após a sincronização.
        </p>
      )}
      <footer>
        <span>Base: {total} pessoas</span>
        <Link href="#campaign-overview">
          Todas as campanhas <Icon name="arrow" size={17} />
        </Link>
      </footer>
    </article>
  );
}
