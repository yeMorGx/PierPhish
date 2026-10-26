import Link from "next/link";
import {
  CampaignLogo,
  useCampaignLogos,
} from "@/components/campaigns/campaign-logo";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import type {
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { DashboardCompanyFilterOption } from "./dashboard-company-filter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type CampaignOverviewCardProps = {
  companies?: Pick<DashboardCompanyFilterOption, "id" | "name" | "logoUrl">[];
  campaigns: CampaignSummary[];
  totals: OverviewTotals;
};

const startDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const startTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function startTimestamp(value: string | null) {
  if (!value || value.startsWith("0001-01-01")) return -Infinity;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
}

function statusLabel(status: string | null) {
  if (!status) return "Sem status";
  if (status === "In progress") return "Em andamento";
  if (status === "Completed") return "Concluída";
  return status;
}

function statusClass(status: string | null) {
  if (status === "Completed") return "campaign-overview-status is-completed";
  if (status === "In progress") return "campaign-overview-status is-progress";
  return "campaign-overview-status is-neutral";
}

function CampaignRate({ value, label }: { value: number; label: string }) {
  const rate = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <span
      className="campaign-overview-rate"
      role="img"
      aria-label={`${label}: ${rate}%`}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle
          className="campaign-overview-rate-track"
          cx="22"
          cy="22"
          r="19"
        />
        <circle
          className="campaign-overview-rate-value"
          cx="22"
          cy="22"
          r="19"
          pathLength="100"
          strokeDasharray={`${rate} 100`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span aria-hidden="true">{rate}%</span>
    </span>
  );
}

export function CampaignOverviewCard({
  companies = [],
  campaigns,
  totals,
}: CampaignOverviewCardProps) {
  const { logos } = useCampaignLogos();
  const recentCampaigns = [...campaigns].sort(
    (first, second) =>
      startTimestamp(second.launch_date) - startTimestamp(first.launch_date) ||
      second.id - first.id,
  );
  const metrics: Array<{
    label: string;
    value: number;
    suffix?: string;
    help: string;
  }> = [
    {
      label: "Campanhas",
      value: totals.campaigns,
      help: "Número de campanhas incluídas no painel após aplicar os filtros atuais.",
    },
    {
      label: "Participações",
      value: totals.people,
      help: "Soma dos destinatários de todas as campanhas. A mesma pessoa é contada novamente se participar de outra campanha.",
    },
    {
      label: "Entregues",
      value: totals.delivered,
      help: "Soma dos e-mails entregues em todas as campanhas incluídas.",
    },
    {
      label: "Abertura",
      value: totals.people
        ? Math.round((totals.opened / totals.people) * 100)
        : 0,
      suffix: "%",
      help: "Aberturas ÷ participações. É calculada sobre os totais consolidados, não pela média das taxas de cada campanha.",
    },
    {
      label: "Taxa de cliques",
      value: totals.clickRate,
      suffix: "%",
      help: "Cliques ÷ e-mails entregues. Se não houver entregas registradas, as participações são usadas como base. O percentual é arredondado.",
    },
    {
      label: "Reportes",
      value: totals.reported,
      help: "Soma das mensagens reportadas nas campanhas incluídas.",
    },
  ] as const;

  return (
    <Card
      as="article"
      id="campaign-overview"
      className="surface-card campaign-overview-card col-span-full min-w-0 scroll-mt-4 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Todas as campanhas
          </h3>
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            Mais recentes primeiro, pela data de início. Horários de Brasília.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="campaign-count-pill rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
            {campaigns.length} campanhas
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-2 max-[1120px]:grid-cols-3 max-[720px]:grid-cols-2">
        {metrics.map(({ label, value, suffix, help }, index) => {
          const mobilePopoverAlignment =
            index % 2 === 1
              ? "max-[720px]:right-0 max-[720px]:left-auto max-[720px]:translate-x-0"
              : "";

          return (
            <div
              className="campaign-overview-metric rounded-[16px] bg-[var(--surface-soft)] px-4 py-3"
              key={label}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                {label}
                <details className="group relative inline-flex">
                  <summary
                    aria-label={`Como calculamos ${label.toLowerCase()}`}
                    className="campaign-overview-help flex size-6 cursor-pointer list-none items-center justify-center rounded-full text-current transition-colors hover:bg-[var(--surface-muted)] [&::-webkit-details-marker]:hidden"
                  >
                    <Icon name="help" size={10} />
                  </summary>
                  <span
                    className={`absolute top-full left-1/2 z-30 mt-2 hidden w-56 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left text-[12px] leading-5 font-normal whitespace-normal text-[var(--ink)] group-open:block ${mobilePopoverAlignment}`}
                  >
                    {help}
                  </span>
                </details>
              </span>
              <strong className="mt-1 block text-[21px] leading-none tracking-[-0.06em] text-[var(--ink)]">
                <AnimatedNumber value={value} suffix={suffix} />
              </strong>
            </div>
          );
        })}
      </div>

      <div
        role="region"
        aria-label="Tabela de campanhas"
        className="campaign-overview-table-wrap mt-5 rounded-[18px] border border-[var(--line-soft)]"
      >
        <table
          role="table"
          className="campaign-overview-table w-full table-fixed border-collapse text-left"
          aria-label="Resumo de todas as campanhas"
        >
          <colgroup>
            {[3, 28, 11, 14, 10, 8, 8, 7, 11].map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead role="rowgroup">
            <tr
              role="row"
              className="campaign-overview-table-head border-b border-[var(--line-soft)] bg-[var(--surface-soft)] text-[12px] text-[var(--text-muted)]"
            >
              <th scope="col" className="px-4 py-3 font-semibold">
                #
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Campanha
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Início
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Empresa
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Entregues
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Abertura
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Cliques
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Reportes
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {recentCampaigns.map((campaign, index) => {
              const startedAt = startTimestamp(campaign.launch_date);
              const company = companies.find(
                (item) => item.id === campaign.company_id,
              );
              return (
                <tr
                  role="row"
                  className="campaign-overview-table-row border-b border-[var(--line-soft)] text-[12px] text-[var(--text-muted)] last:border-0 hover:bg-[var(--surface-soft)]"
                  key={campaign.id}
                >
                  <td
                    role="cell"
                    data-label="Posição"
                    className="px-4 py-3.5 font-bold text-[var(--text-muted)]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td role="cell" data-label="Campanha" className="px-4 py-3.5">
                    <Link
                      className="campaign-link flex min-w-0 items-center gap-3 hover:text-[var(--ink)]"
                      href={`/campaigns/${campaign.id}`}
                    >
                      <CampaignLogo
                        fallback={campaign.name.charAt(0).toUpperCase()}
                        src={logos[String(campaign.id)]}
                      />
                      <span className="flex min-w-0 flex-col">
                        <strong className="campaign-name text-[12px] break-words text-[var(--ink)]">
                          {campaign.name}
                        </strong>
                        <span className="campaign-id mt-0.5 text-[11px] text-[var(--text-muted)]">
                          ID {campaign.id}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td role="cell" data-label="Início" className="px-4 py-3.5">
                    {Number.isFinite(startedAt) ? (
                      <time
                        className="campaign-overview-start"
                        dateTime={new Date(startedAt).toISOString()}
                      >
                        <span>{startDateFormatter.format(startedAt)}</span>
                        <span className="campaign-overview-start-time">
                          {startTimeFormatter.format(startedAt)}
                        </span>
                      </time>
                    ) : (
                      <span>Não informada</span>
                    )}
                  </td>
                  <td role="cell" data-label="Empresa" className="px-4 py-3.5">
                    {company ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          className="campaign-company-logo after:hidden"
                          aria-hidden="true"
                        >
                          {company.logoUrl && (
                            <AvatarImage src={company.logoUrl} alt="" />
                          )}
                          <AvatarFallback>
                            {company.name.trim().charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 text-[12px] font-medium break-words text-[var(--ink)]">
                          {company.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[var(--text-muted)]">
                        Empresa não informada
                      </span>
                    )}
                  </td>
                  <td
                    role="cell"
                    data-label="Entregues"
                    className="px-4 py-3.5"
                  >
                    <span>
                      <AnimatedNumber value={campaign.deliveredPeople} />/
                      <AnimatedNumber value={campaign.people} />
                    </span>
                  </td>
                  <td role="cell" data-label="Abertura" className="px-4 py-3.5">
                    <CampaignRate
                      value={campaign.openRate}
                      label="Taxa de abertura"
                    />
                  </td>
                  <td role="cell" data-label="Cliques" className="px-4 py-3.5">
                    <CampaignRate
                      value={campaign.clickRate}
                      label="Taxa de cliques"
                    />
                  </td>
                  <td role="cell" data-label="Reportes" className="px-4 py-3.5">
                    <AnimatedNumber value={campaign.reportedPeople} />
                  </td>
                  <td role="cell" data-label="Status" className="px-4 py-3.5">
                    <span className={statusClass(campaign.status)}>
                      {statusLabel(campaign.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!campaigns.length && (
              <tr role="row">
                <td
                  role="cell"
                  className="px-4 py-8 text-center text-[11px] text-[var(--text-muted)]"
                  colSpan={9}
                >
                  Nenhuma campanha encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
