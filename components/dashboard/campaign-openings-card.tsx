import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CampaignBar } from "@/components/dashboard/types";

type CampaignOpeningsCardProps = {
  campaigns: CampaignBar[];
  total: number;
};

export function CampaignOpeningsCard({
  campaigns,
  total,
}: CampaignOpeningsCardProps) {
  return (
    <article className="surface-card flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            CAMPANHAS
          </p>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Abertura por campanha
          </h3>
        </div>
        <Link
          href="#campaign-overview"
          className="inline-flex items-center gap-[5px] text-[11px] text-[#818995] hover:text-[#18202b]"
        >
          Ver campanhas <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div
        className="flex min-h-0 flex-1 items-end overflow-x-auto border-b border-[#e9ebec]"
        aria-label="Taxa de abertura de todas as campanhas"
      >
        <div
          className="flex h-full min-w-full items-end gap-[clamp(12px,2vw,24px)] px-3 pt-6"
          style={{ minWidth: `${Math.max(campaigns.length * 76, 300)}px` }}
        >
          {campaigns.map((campaign, index) => (
            <div
              className="flex h-full min-w-[52px] flex-1 flex-col items-center justify-end gap-[9px]"
              key={campaign.id}
            >
              <div className="-mb-1 text-[11px] font-extrabold text-[#637887]">
                {campaign.rate}%
              </div>
              <div className="flex h-[66%] w-[min(44px,100%)] items-end overflow-hidden rounded-[9px_9px_0_0] bg-[#eef0f1]">
                <div
                  className={`min-h-[7px] w-full rounded-[9px_9px_0_0] transition-[height] duration-500 ease-in-out ${index === 0 ? "bg-[#7d9aaa]" : "bg-[#a8bfd1]"}`}
                  style={{ height: `${Math.max(campaign.rate, 5)}%` }}
                />
              </div>
              <span className="max-w-[70px] overflow-hidden text-[9px] text-ellipsis whitespace-nowrap text-[#9ba2a9]">
                {campaign.name.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-[15px] flex justify-between gap-3 text-[10px] text-[#9ba2a9]">
        <span className="inline-flex items-center gap-[7px] text-[#65717b]">
          <i className="size-1.5 rounded-full bg-[#7d9aaa]" />
          Abertura
        </span>
        <span>Base: {total} pessoas</span>
      </div>
    </article>
  );
}
