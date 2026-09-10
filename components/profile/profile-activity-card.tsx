import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Campaign } from "@/components/dashboard/types";

type ProfileActivityCardProps = {
  campaigns: Campaign[];
  error: string | null;
  loading: boolean;
};

function statusLabel(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("complete") || normalized.includes("conclu"))
    return "Concluída";
  if (normalized.includes("draft") || normalized.includes("rascun"))
    return "Rascunho";
  return "Em andamento";
}

function statusClass(status: string | null) {
  return statusLabel(status) === "Concluída"
    ? "profile-activity-status is-complete"
    : "profile-activity-status";
}

function activityDate(campaign: Campaign) {
  const value = campaign.synced_at ?? campaign.launch_date;
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function ProfileActivityCard({
  campaigns,
  error,
  loading,
}: ProfileActivityCardProps) {
  return (
    <section className="surface-card profile-panel-card">
      <div className="profile-panel-heading">
        <div>
          <p className="profile-eyebrow">ATIVIDADE RECENTE</p>
          <h2>Campanhas acompanhadas</h2>
        </div>
        <Link className="profile-panel-link" href="/#campaign-overview">
          Ver todas
          <Icon name="arrow" size={15} />
        </Link>
      </div>
      <p className="profile-panel-description">
        As campanhas abaixo foram as últimas atualizadas no seu ambiente.
      </p>
      {error && <p className="profile-inline-error">{error}</p>}
      <div className="profile-activity-list" aria-live="polite">
        {loading && !campaigns.length ? (
          <p className="profile-empty-state">Carregando atividade…</p>
        ) : campaigns.length ? (
          campaigns.map((campaign) => (
            <Link
              className="profile-activity-row"
              href={`/campaigns/${campaign.id}`}
              key={campaign.id}
            >
              <span className="profile-activity-mark" aria-hidden="true">
                <span />
              </span>
              <span className="profile-activity-copy">
                <strong>{campaign.name}</strong>
                <small>ID {campaign.id}</small>
              </span>
              <span className={statusClass(campaign.status)}>
                {statusLabel(campaign.status)}
              </span>
              <span className="profile-activity-date">
                {activityDate(campaign)}
              </span>
              <Icon name="arrow" size={15} />
            </Link>
          ))
        ) : (
          <p className="profile-empty-state">
            Nenhuma campanha sincronizada neste ambiente.
          </p>
        )}
      </div>
    </section>
  );
}
