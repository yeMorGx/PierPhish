import Link from "next/link";
import {
  CampaignLogo,
  useCampaignLogos,
} from "@/components/campaigns/campaign-logo";
import {
  AnimatedTooltip,
  type AnimatedTooltipItem,
} from "@/components/ui/animated-tooltip";
import type {
  CampaignParticipants,
  CampaignSummary,
  OverviewTotals,
} from "@/components/dashboard/types";
import type { PersonAvatarMap } from "@/lib/person-avatars";

type CampaignOverviewCardProps = {
  campaigns: CampaignSummary[];
  personAvatars?: PersonAvatarMap;
  participantsByCampaign?: CampaignParticipants;
  totals: OverviewTotals;
};

function avatarUrl(
  name: string,
  index: number,
  avatar: string | null | undefined,
) {
  if (avatar) return avatar;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const fills = ["#202831", "#66737b", "#9aa3a6", "#c9cfcc"];
  const fill = fills[index % fills.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="${fill}"/><text x="40" y="44" fill="#ffffff" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function tooltipPeople(
  campaignId: number,
  participants: CampaignParticipants[string],
  personAvatars: PersonAvatarMap,
): AnimatedTooltipItem[] {
  return participants.slice(0, 4).map((participant, index) => ({
    id: campaignId * 10 + index,
    name: participant.name,
    designation: participant.id.includes("@")
      ? participant.id
      : "Pessoa participante",
    image: avatarUrl(participant.name, index, personAvatars[participant.id]),
  }));
}

function statusLabel(status: string | null) {
  if (!status) return "Sem status";
  if (status === "In progress") return "Em andamento";
  if (status === "Completed") return "Concluída";
  return status;
}

function statusClass(status: string | null) {
  if (status === "Completed")
    return "campaign-status campaign-status-completed bg-[#edf5ee] text-[#5d7161]";
  if (status === "In progress")
    return "campaign-status campaign-status-progress bg-[#fff6e7] text-[#926f35]";
  return "campaign-status campaign-status-neutral bg-[#f4f6f7] text-[#7c8795]";
}

export function CampaignOverviewCard({
  campaigns,
  personAvatars = {},
  participantsByCampaign = {},
  totals,
}: CampaignOverviewCardProps) {
  const { logos } = useCampaignLogos();
  const metrics = [
    ["Campanhas", totals.campaigns],
    ["Pessoas", totals.people],
    ["Entregues", totals.delivered],
    [
      "Abertura",
      `${totals.people ? Math.round((totals.opened / totals.people) * 100) : 0}%`,
    ],
    ["Cliques", totals.clicked],
    ["Reportes", totals.reported],
  ] as const;

  return (
    <article
      id="campaign-overview"
      className="surface-card campaign-overview-card col-span-full min-w-0 scroll-mt-4 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]"
    >
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
          <span className="campaign-count-pill rounded-full bg-[#f4f6f7] px-3 py-1.5">
            {campaigns.length} campanhas
          </span>
          {campaigns[0] && (
            <span className="campaign-reach-pill rounded-full bg-[#edf2f3] px-3 py-1.5 text-[#5f7681]">
              Maior alcance: {campaigns[0].name}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-2 max-[1120px]:grid-cols-3 max-[720px]:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div
            className="campaign-overview-metric rounded-[16px] bg-[#f7f8f8] px-4 py-3"
            key={label}
          >
            <span className="block text-[10px] text-[#8b949d]">{label}</span>
            <strong className="mt-1 block text-[21px] leading-none tracking-[-0.06em] text-[#18202b]">
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div className="campaign-overview-table-wrap mt-5 overflow-x-auto rounded-[18px] border border-[#edf0f1]">
        <table
          className="campaign-overview-table w-full min-w-[820px] border-collapse text-left"
          aria-label="Resumo de todas as campanhas"
        >
          <thead>
            <tr className="campaign-overview-table-head border-b border-[#edf0f1] bg-[#fafbfb] text-[10px] tracking-[0.1em] text-[#9299a2] uppercase">
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
              <tr
                className="campaign-overview-table-row border-b border-[#f0f1f2] text-[11px] text-[#69737d] last:border-0 hover:bg-[#fcfdfd]"
                key={campaign.id}
              >
                <td className="px-4 py-3.5 font-bold text-[#9aa3aa]">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    className="campaign-link flex min-w-0 items-center gap-3 hover:text-[#18202b]"
                    href={`/campaigns/${campaign.id}`}
                  >
                    <CampaignLogo
                      fallback={campaign.name.charAt(0).toUpperCase()}
                      src={logos[String(campaign.id)]}
                    />
                    <span className="flex min-w-0 flex-col">
                      <strong className="campaign-name overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#35414d]">
                        {campaign.name}
                      </strong>
                      <span className="campaign-id mt-0.5 text-[10px] text-[#a0a7ad]">
                        ID {campaign.id}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex min-w-[170px] items-center gap-3">
                    <AnimatedTooltip
                      items={tooltipPeople(
                        campaign.id,
                        participantsByCampaign[String(campaign.id)] ?? [],
                        personAvatars,
                      )}
                      numPeople={Math.max(
                        campaign.people -
                          (participantsByCampaign[String(campaign.id)] ?? [])
                            .length,
                        0,
                      )}
                    />
                    {index === 0 && (
                      <span className="inline-flex rounded-full bg-[#edf2f3] px-2 py-1 text-[9px] font-bold text-[#5f7681]">
                        maior alcance
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {campaign.deliveredPeople}/{campaign.people}
                </td>
                <td className="campaign-open-rate px-4 py-3.5 font-bold text-[#5d7161]">
                  {campaign.openRate}%
                </td>
                <td className="px-4 py-3.5">{campaign.clickedPeople}</td>
                <td className="px-4 py-3.5">{campaign.reportedPeople}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(campaign.status)}`}
                  >
                    {statusLabel(campaign.status)}
                  </span>
                </td>
              </tr>
            ))}
            {!campaigns.length && (
              <tr>
                <td
                  className="px-4 py-8 text-center text-[11px] text-[#9aa1a7]"
                  colSpan={8}
                >
                  Nenhuma campanha encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
