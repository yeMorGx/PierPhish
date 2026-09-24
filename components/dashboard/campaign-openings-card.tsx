import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
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
    <article className="surface-card campaign-openings-card flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Abertura por campanha
          </h3>
        </div>
        <Link
          href="#campaign-overview"
          className="inline-flex items-center gap-[5px] text-[12px] text-[var(--text-muted)] hover:text-[#18202b]"
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
          {campaigns.map((campaign) => (
            <div
              className="flex h-full min-w-[52px] flex-1 flex-col items-center justify-end gap-[9px]"
              key={campaign.id}
            >
              <div className="-mb-1 text-[11px] font-extrabold text-[#637887]">
                <AnimatedNumber value={campaign.rate} suffix="%" />
              </div>
              <div className="flex h-[66%] w-[min(44px,100%)] items-end overflow-hidden rounded-[9px_9px_0_0] bg-[#eef0f1]">
                <div
                  className="w-full rounded-[9px_9px_0_0] bg-[var(--chart-series)] transition-[height] duration-500 ease-in-out"
                  style={{ height: `${campaign.rate}%` }}
                />
              </div>
              <span
                className="max-w-[70px] overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-[var(--text-muted)]"
                title={campaign.name}
              >
                {campaign.name.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-[15px] flex justify-between gap-3 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-[7px] text-[#65717b]">
          <i className="size-1.5 rounded-full bg-[var(--chart-series)]" />
          Abertura
        </span>
        <span>Base: {total} pessoas</span>
      </div>
    </article>
  );
}
