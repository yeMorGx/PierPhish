import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Campaign, EventRow } from "@/components/dashboard/types";

type InvestigationCardProps = {
  campaigns: Campaign[];
  events: EventRow[];
  loading: boolean;
  onSelectedChange: (id: number) => void;
  selectedCampaignId: number | null;
};

export function InvestigationCard({
  campaigns,
  events,
  loading,
  onSelectedChange,
  selectedCampaignId,
}: InvestigationCardProps) {
  return (
    <article id="individual-investigation" className="surface-card scroll-mt-4 col-span-2 min-w-0 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:col-span-full max-[1120px]:rounded-[45px] max-[720px]:col-span-1 max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            EVENTOS RECENTES
          </p>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Investigação individual
          </h3>
        </div>
        <div className="flex max-w-[58%] items-center gap-2 max-[720px]:max-w-full max-[720px]:flex-1">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Campanha para investigar</span>
            <select
              className="min-h-[34px] w-full max-w-[250px] rounded-[10px] border border-[#e4e8ea] bg-[#fafbfb] px-2.5 text-[10px] font-bold text-[#52616c] outline-none focus:border-[#7d92a0] focus:ring-[3px] focus:ring-[rgba(125,146,160,0.12)]"
              value={selectedCampaignId ?? ""}
              onChange={(event) => onSelectedChange(Number(event.target.value))}
              disabled={!campaigns.length}
            >
              {!campaigns.length && (
                <option value="">Nenhuma campanha disponível</option>
              )}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <span className="flex-none text-[10px] text-[#a0a7ad]">
            {events.length} eventos
          </span>
        </div>
      </div>
      <div className="mt-[17px]">
        {events.map((event, index) => (
          <div
            className="grid grid-cols-[10px_1fr_15px] items-center gap-[11px] border-b border-[#eff0f0] py-[14px] last:border-0"
            key={event.id}
          >
            <span
              className={`size-[7px] rounded-full shadow-[0_0_0_4px_#edf2f3] ${index === 1 ? "bg-[#e0a17d] shadow-[0_0_0_4px_#fbefe9]" : index === 2 ? "bg-[#9dbd47] shadow-[0_0_0_4px_#f0f6dd]" : "bg-[#b5c5cc]"}`}
            />
            <div className="flex min-w-0 items-center justify-between gap-3">
              <strong className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#4f5963]">
                {event.event_type ?? "Evento registrado"}
              </strong>
              <span className="flex-none text-[10px] text-[#a5abb1]">
                {formatDate(event.occurred_at)}
              </span>
            </div>
            <Icon name="arrow" size={15} />
          </div>
        ))}
        {!isSupabaseConfigured && (
          <div className="mt-3 inline-block rounded-md bg-[#fff7ef] px-2 py-[5px] text-[9px] text-[#9a7b5e]">
            Dados de demonstração
          </div>
        )}
        {isSupabaseConfigured && !events.length && !loading && (
          <div className="py-[25px] text-[11px] text-[#9aa1a7]">
            Nenhum evento retornado para a campanha selecionada.
          </div>
        )}
      </div>
    </article>
  );
}
