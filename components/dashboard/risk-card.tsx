import { Icon } from "@/components/ui/icon";

type RiskCardProps = {
  clicked: number;
  delivered: number;
  opened: number;
  reported: number;
  submitted: number;
  total: number;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function RiskCard({
  clicked,
  delivered,
  opened,
  reported,
  submitted,
  total,
}: RiskCardProps) {
  const metrics = [
    ["Entregues", `${delivered}/${total}`, pct(delivered, total)],
    ["Abertura", `${opened}/${total}`, pct(opened, total)],
    ["Dados enviados", `${submitted}`, pct(submitted, total)],
  ] as const;

  return (
    <article id="risk-overview" className="surface-card risk-overview bento-risk-card scroll-mt-4 min-w-0 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:col-span-full max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            RISCO HUMANO
          </p>
          <h3 className="m-0 text-[17px] font-bold tracking-[-0.03em]">
            Leitura consolidada
          </h3>
        </div>
        <span className="theme-inset-panel grid size-[33px] place-items-center rounded-[11px] bg-[rgba(255,255,255,0.5)] text-[#607268]">
          <Icon name="shield" size={18} />
        </span>
      </div>
      <div className="my-[29px] flex items-baseline gap-2.5">
        <strong className="bento-risk-total text-[58px] leading-[0.8] font-[620] tracking-[-0.1em]">
          {clicked + reported}
        </strong>
        <span className="text-[11px] text-[#7d8b80]">sinais de atenção</span>
      </div>
      <div className="flex flex-col gap-[18px] text-[10px] text-[#748177]">
        {metrics.map(([label, value, width]) => (
          <div className="grid grid-cols-[1fr_auto] gap-[7px]" key={label}>
            <span className="bento-risk-label">{label}</span>
            <strong className="bento-risk-value text-[10px] text-[#4e5d53]">{value}</strong>
            <div className="bento-risk-track col-span-full h-[5px] overflow-hidden rounded-md bg-[rgba(98,125,107,0.14)]">
              <i
                className="bento-risk-fill block h-full rounded-[inherit]"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="bento-risk-footer mt-[25px] flex items-center gap-[9px] border-t border-[rgba(98,125,107,0.13)] pt-[17px]">
        <span className="grid size-[19px] flex-none place-items-center rounded-full bg-[#6c836e] text-[11px] font-extrabold text-white">
          !
        </span>
        <p className="m-0 text-[10px] leading-[1.35] text-[#7d8b80]">
          Abra uma campanha para ver os detalhes individuais.
        </p>
      </div>
    </article>
  );
}
