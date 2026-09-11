import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type RiskCardProps = {
  clicked: number;
  delivered: number;
  opened: number;
  reported: number;
  submitted: number;
  total: number;
};
export function RiskCard({
  clicked,
  opened,
  reported,
  submitted,
  total,
}: RiskCardProps) {
  const signals = [
    { label: "Abriram o e-mail", value: opened, color: "var(--neo-purple)" },
    { label: "Clicaram no link", value: clicked, color: "var(--neo-coral)" },
    { label: "Enviaram dados", value: submitted, color: "var(--neo-lime)" },
  ];
  return (
    <article id="risk-overview" className="surface-card neo-risk-card">
      <div className="neo-card-heading">
        <div>
          <span className="neo-eyebrow">COMPORTAMENTO OBSERVADO</span>
          <h3>Além da abertura.</h3>
        </div>
        <Icon name="shield" size={25} />
      </div>
      <div className="neo-risk-reading">
        <strong>
          {total ? Math.round((clicked / total) * 100) : 0}
          <small>%</small>
        </strong>
        <span>
          da base clicou
          <br />
          em um link
        </span>
      </div>
      <div className="neo-risk-signals">
        {signals.map((signal) => (
          <div key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
            <div className="neo-risk-track">
              <i
                style={{
                  width: `${total ? Math.min((signal.value / total) * 100, 100) : 0}%`,
                  background: signal.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="neo-risk-note">
        {reported} reportes registrados pela equipe.
      </p>
      <Link className="neo-risk-action" href="/riscos">
        Ver pessoas por risco <Icon name="arrow" size={18} />
      </Link>
    </article>
  );
}
