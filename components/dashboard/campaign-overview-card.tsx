import Link from "next/link";
import type { CampaignSummary, OverviewTotals } from "@/components/dashboard/types";

type CampaignOverviewCardProps = {
  campaigns: CampaignSummary[];
  totals: OverviewTotals;
};

function statusLabel(status: string | null) {
  if (!status) return "Sem status";
  if (status === "In progress") return "Em andamento";
  if (status === "Completed") return "Concluída";
  return status;
}

function statusClass(status: string | null) {
  if (status === "Completed") return "bg-[#edf5ee] text-[#5d7161]";
  if (status === "In progress") return "bg-[#fff6e7] text-[#926f35]";
  return "bg-[#f4f6f7] text-[#7c8795]";
}

export function CampaignOverviewCard({
  campaigns,
  totals,
}: CampaignOverviewCardProps) {
  const metrics = [
    ["Campanhas", totals.campaigns],
    ["Pessoas", totals.people],
    ["Entregues", totals.delivered],
    ["Abertura", `${totals.people ? Math.round((totals.opened / totals.people) * 100) : 0}%`],
    ["Cliques", totals.clicked],
    ["Reportes", totals.reported],
  ] as const;

  return (
    <article id="campaign-overview" className="surface-card col-span-full min-w-0 scroll-mt-4 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            VISÃO DE CAMPANHAS
          </p>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Todas as campanhas
          </h3>
          <p className="mt-2 text-[11px] text-[#8b949d]">
            Ranking por quantidade de pessoas incluídas em cada campanha.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] text-[#89939c]">
          <span className="rounded-full bg-[#f4f6f7] px-3 py-1.5">
            {campaigns.length} campanhas
          </span>
          {campaigns[0] && (
            <span className="rounded-full bg-[#edf2f3] px-3 py-1.5 text-[#5f7681]">
              Maior alcance: {campaigns[0].name}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-2 max-[1120px]:grid-cols-3 max-[720px]:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div className="rounded-[16px] bg-[#f7f8f8] px-4 py-3" key={label}>
            <span className="block text-[10px] text-[#8b949d]">{label}</span>
            <strong className="mt-1 block text-[21px] leading-none tracking-[-0.06em] text-[#18202b]">
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-[18px] border border-[#edf0f1]">
        <table className="w-full min-w-[820px] border-collapse text-left" aria-label="Resumo de todas as campanhas">
          <thead>
            <tr className="border-b border-[#edf0f1] bg-[#fafbfb] text-[10px] tracking-[0.1em] text-[#9299a2] uppercase">
              <th className="w-[48px] px-4 py-3 font-extrabold">#</th>
              <th className="px-4 py-3 font-extrabold">Campanha</th>
              <th className="px-4 py-3 font-extrabold">Pessoas</th>
              <th className="px-4 py-3 font-extrabold">Entregues</th>
              <th className="px-4 py-3 font-extrabold">Abertura</th>
              <th className="px-4 py-3 font-extrabold">Cliques</th>
              <th className="px-4 py-3 font-extrabold">Reportes</th>
              <th className="px-4 py-3 font-extrabold">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => (
              <tr className="border-b border-[#f0f1f2] text-[11px] text-[#69737d] last:border-0 hover:bg-[#fcfdfd]" key={campaign.id}>
                <td className="px-4 py-3.5 font-bold text-[#9aa3aa]">{String(index + 1).padStart(2, "0")}</td>
                <td className="px-4 py-3.5">
                  <Link className="flex min-w-0 items-center gap-3 hover:text-[#18202b]" href={`/campaigns/${campaign.id}`}>
                    <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-[#18202b] text-[11px] font-bold text-white">
                      {campaign.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <strong className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#35414d]">{campaign.name}</strong>
                      <span className="mt-0.5 text-[10px] text-[#a0a7ad]">ID {campaign.id}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3.5"><strong className="text-[14px] text-[#18202b]">{campaign.people}</strong>{index === 0 && <span className="ml-2 rounded-full bg-[#edf2f3] px-2 py-1 text-[9px] font-bold text-[#5f7681]">maior alcance</span>}</td>
                <td className="px-4 py-3.5">{campaign.deliveredPeople}/{campaign.people}</td>
                <td className="px-4 py-3.5 font-bold text-[#5d7161]">{campaign.openRate}%</td>
                <td className="px-4 py-3.5">{campaign.clickedPeople}</td>
                <td className="px-4 py-3.5">{campaign.reportedPeople}</td>
                <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(campaign.status)}`}>{statusLabel(campaign.status)}</span></td>
              </tr>
            ))}
            {!campaigns.length && (
              <tr>
                <td className="px-4 py-8 text-center text-[11px] text-[#9aa1a7]" colSpan={8}>Nenhuma campanha encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
