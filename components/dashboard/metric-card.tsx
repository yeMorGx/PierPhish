import { Icon } from "@/components/ui/icon";
type MetricCardProps = {
  label: string;
  value: number;
  helper: string;
  tone?: "ink" | "blue" | "orange" | "green";
};
export function MetricCard({
  helper,
  label,
  tone = "ink",
  value,
}: MetricCardProps) {
  return (
    <article className={`surface-card neo-metric neo-metric-${tone}`}>
      <div>
        <span>{label}</span>
        <Icon name={label === "Reportes" ? "shield" : "arrow"} size={21} />
      </div>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
