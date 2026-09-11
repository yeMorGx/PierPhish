type SignalSummaryCardProps = {
  clicked: number;
  delivered: number;
  people: number;
  reported: number;
  submitted: number;
};

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function SignalSummaryCard({
  clicked,
  delivered,
  people,
  reported,
  submitted,
}: SignalSummaryCardProps) {
  const signals = [
    {
      label: "Cliques",
      value: clicked,
      rate: pct(clicked, people),
      helper: "interagiram com a mensagem",
      priority: false,
    },
    {
      label: "Dados enviados",
      value: submitted,
      rate: pct(submitted, people),
      helper: "forneceram dados",
      priority: true,
    },
    {
      label: "Reportes",
      value: reported,
      rate: pct(reported, delivered),
      helper: "reportaram a mensagem",
      priority: false,
    },
  ];

  return (
    <article className="surface-card bento-signals-card min-w-0 overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            SINAIS DA OPERAÇÃO
          </p>
          <h3 className="m-0 text-[17px] font-medium tracking-[-0.03em]">
            Onde olhar primeiro
          </h3>
          <p className="mt-2 max-w-[280px] text-[11px] leading-[1.45] text-[#8b949d]">
            Comportamentos que ajudam a definir a próxima ação.
          </p>
        </div>
        <span className="bento-signals-index text-[10px] font-medium text-[#9299a2]">
          03 sinais
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {signals.map((signal) => (
          <div className="bento-signal-row" key={signal.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="flex items-center gap-2 text-[11px] text-[#69737d]">
                <i
                  className={`size-1.5 rounded-full ${signal.priority ? "bg-[var(--accent)]" : "bg-[#a8b4b7]"}`}
                />
                {signal.label}
              </span>
              <strong className="text-[16px] font-[var(--font-data)] font-normal tracking-[-0.05em] text-[#202831]">
                {signal.value}
              </strong>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#ececea]">
              <i
                className={`block h-full rounded-[inherit] ${signal.priority ? "bg-[var(--accent)]" : "bg-[#7d9aaa]"}`}
                style={{ width: `${Math.min(signal.rate, 100)}%` }}
              />
            </div>
            <span className="mt-1.5 block text-[9px] text-[#969da2]">
              {signal.rate}% da base · {signal.helper}
            </span>
          </div>
        ))}
      </div>

      <div className="bento-signals-footer mt-5 border-t border-[#ebedeb] pt-4 text-[10px] text-[#7c8790]">
        Comece por quem clicou ou enviou dados.
      </div>
    </article>
  );
}
