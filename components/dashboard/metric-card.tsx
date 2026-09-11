type MetricCardProps = {
  label: string;
  value: number;
  helper: string;
  tone?: "ink" | "blue" | "orange" | "green";
};

const tones = {
  ink: "text-[var(--ink)]",
  blue: "text-[var(--ink)]",
  orange: "text-[var(--accent)]",
  green: "text-[var(--ink)]",
};

export function MetricCard({
  helper,
  label,
  tone = "ink",
  value,
}: MetricCardProps) {
  return (
    <article className={`surface-card bento-metric-card ${tone === "orange" ? "is-accent" : ""} relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[var(--radius-card)] p-[25px] max-[1120px]:rounded-[45px] max-[720px]:rounded-[23px] max-[720px]:p-[22px]`}>
      <span className="relative z-[1] text-[11px] font-bold text-[#63778b]">
        {label}
      </span>
      <strong
        className={`bento-metric-value relative z-[1] mt-2.5 text-[58px] leading-[0.85] font-[630] tracking-[-0.1em] ${tones[tone]}`}
      >
        {value}
      </strong>
      <span className="relative z-[1] text-[10px] text-[#8091a1]">{helper}</span>
    </article>
  );
}
