import {
  Flag,
  Inbox,
  KeyRound,
  MailOpen,
  MousePointerClick,
  Send,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import type { Stats } from "@/components/dashboard/types";

const countFormatter = new Intl.NumberFormat("pt-BR", {
  minimumIntegerDigits: 2,
});

function validCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function CampaignMetrics({
  stats: suppliedStats,
}: {
  stats?: Stats | null;
}) {
  const stats = suppliedStats ?? {};
  const total = validCount(stats.total);
  const metrics = [
    {
      label: "Participações",
      value: stats.total,
      icon: UsersRound,
      showRate: false,
    },
    { label: "Enviados", value: stats.sent, icon: Send, showRate: false },
    { label: "Entregues", value: stats.delivered, icon: Inbox, showRate: true },
    { label: "Abertos", value: stats.opened, icon: MailOpen, showRate: true },
    {
      label: "Clicados",
      value: stats.clicked,
      icon: MousePointerClick,
      showRate: true,
    },
    {
      label: "Dados enviados",
      value: stats.submitted_data,
      icon: KeyRound,
      showRate: true,
    },
    {
      label: "Reportado",
      value: stats.email_reported,
      icon: Flag,
      showRate: true,
    },
    {
      label: "Falharam",
      value: stats.error,
      icon: TriangleAlert,
      showRate: true,
    },
  ];

  return (
    <section
      className="campaign-delivery-summary"
      aria-label="Resumo da campanha"
      data-tour="campaign-metrics"
    >
      <dl className="campaign-delivery-metrics">
        {metrics.map(({ label, value, icon: MetricIcon, showRate }) => {
          const count = validCount(value);
          const rate =
            count !== null && total !== null && total > 0
              ? Math.round((count / total) * 100)
              : null;
          return (
            <div className="campaign-delivery-metric" key={label}>
              <dt>
                <MetricIcon size={18} strokeWidth={1.7} aria-hidden="true" />
                {label}
              </dt>
              <dd>
                <strong
                  className={
                    count === null ? "campaign-delivery-unavailable" : undefined
                  }
                >
                  {count === null
                    ? "Não disponível"
                    : countFormatter.format(count)}
                </strong>
                {showRate && rate !== null && <span>{rate}%</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="campaign-delivery-metrics-note">
        Participações são os destinatários desta campanha. Os percentuais usam
        esse total. Campos não disponíveis ainda não foram informados pela
        sincronização.
      </p>
    </section>
  );
}
