import { formatDate } from "@/lib/format";
import type { OverviewTotals } from "@/components/dashboard/types";

type OverviewHeroProps = {
  activeCampaigns: number;
  latestSync: string | null;
  totals: OverviewTotals;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function OverviewHero({
  activeCampaigns,
  latestSync,
  totals,
}: OverviewHeroProps) {
  const journey = [
    ["Base total", totals.people, 100],
    ["Entregues", totals.delivered, pct(totals.delivered, totals.people)],
    ["Aberturas", totals.opened, pct(totals.opened, totals.people)],
    ["Cliques", totals.clicked, pct(totals.clicked, totals.people)],
  ] as const;
  const highlights = [
    ["Campanhas", totals.campaigns],
    ["Pessoas", totals.people],
    ["Reportes", totals.reported],
    ["Dados enviados", totals.submitted],
  ] as const;

  return (
    <article className="relative col-span-full min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-8 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[1120px]:rounded-[45px] max-[900px]:p-7 max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="grid h-full min-h-[266px] grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)] gap-8 max-[900px]:grid-cols-1">
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <h2 className="m-0 max-w-[700px] text-[clamp(31px,3.7vw,54px)] leading-[0.94] font-[660] tracking-[-0.07em]">
              {totals.campaigns || "Todas as"} campanhas.
              <br />
              <em className="text-[#7c8795] not-italic">Um único panorama.</em>
            </h2>
            <p className="mt-4 max-w-[560px] text-[12px] leading-[1.55] text-[#7b838d]">
              Alcance, entregas e sinais de exposição somados em toda a
              operação, sem privilegiar uma campanha específica.
            </p>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between gap-3 text-[9px] font-bold tracking-[0.12em] text-[#9299a2] uppercase">
              <span>Jornada consolidada</span>
              <span className="font-medium tracking-normal normal-case">
                Atualizado {formatDate(latestSync)}
              </span>
            </div>
            <div className="grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#e9edef] bg-[#fafbfb] max-[620px]:grid-cols-2">
              {journey.map(([label, value, rate], index) => (
                <div
                  className={`relative px-4 py-3.5 ${index < 3 ? "border-r border-[#e9edef] max-[620px]:border-r-0" : ""} ${index < 2 ? "max-[620px]:border-b" : ""} ${index % 2 === 0 ? "max-[620px]:border-r" : ""}`}
                  key={label}
                >
                  <span className="block text-[9px] text-[#8d969e]">{label}</span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <strong className="text-[20px] leading-none tracking-[-0.06em] text-[#18202b]">
                      {value}
                    </strong>
                    <span className="text-[9px] font-bold text-[#718895]">
                      {rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[24px] bg-[#f3f6f7] p-6 before:absolute before:-top-16 before:-right-12 before:size-44 before:rounded-full before:border before:border-[rgba(112,139,153,0.13)] before:shadow-[0_0_0_28px_rgba(112,139,153,0.035),0_0_0_56px_rgba(112,139,153,0.02)] before:content-[''] max-[720px]:rounded-[19px] max-[720px]:p-5">
          <div className="relative z-[1] flex items-start justify-between gap-4">
            <div>
              <span className="block text-[9px] font-extrabold tracking-[0.14em] text-[#7d8992] uppercase">
                Taxa geral
              </span>
              <strong className="mt-1 block text-[13px] text-[#34434d]">
                Abertura consolidada
              </strong>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[#687b86] shadow-[0_4px_14px_rgba(26,42,52,0.05)]">
              {activeCampaigns} em andamento
            </span>
          </div>

          <div className="relative z-[1] my-4 flex items-center gap-5 max-[420px]:flex-col">
            <div
              className="grid size-[132px] flex-none rotate-[-34deg] place-items-center rounded-full [background:conic-gradient(#7892a0_var(--score),rgba(120,146,160,0.12)_0)]"
              style={{ "--score": `${pct(totals.opened, totals.people)}%` } as React.CSSProperties}
            >
              <div className="flex size-[104px] rotate-[34deg] flex-col items-center justify-center rounded-full bg-[#f3f6f7]">
                <strong className="text-[31px] leading-none tracking-[-0.08em]">
                  {pct(totals.opened, totals.people)}%
                </strong>
                <span className="mt-1 text-[9px] text-[#87919a]">abertura</span>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2">
              {highlights.map(([label, value]) => (
                <div
                  className="rounded-[13px] border border-[rgba(120,146,160,0.12)] bg-[rgba(255,255,255,0.58)] px-3 py-2.5"
                  key={label}
                >
                  <span className="block text-[8px] leading-tight text-[#84909a]">
                    {label}
                  </span>
                  <strong className="mt-1 block text-[17px] leading-none tracking-[-0.05em] text-[#26343e]">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-[1] flex items-center gap-2 border-t border-[rgba(115,139,151,0.13)] pt-3 text-[9px] text-[#788791]">
            <span className="size-1.5 rounded-full bg-[#9fc52d]" />
            Dados de todas as campanhas sincronizadas
          </div>
        </div>
      </div>
    </article>
  );
}
