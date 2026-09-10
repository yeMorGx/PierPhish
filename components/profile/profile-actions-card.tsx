import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const actions = [
  {
    href: "/",
    icon: "chart" as const,
    label: "Visão geral",
    description: "Acompanhe o panorama consolidado.",
  },
  {
    href: "/riscos",
    icon: "users" as const,
    label: "Pessoas por risco",
    description: "Investigue sinais por pessoa.",
  },
  {
    href: "/apresentacao",
    icon: "grid" as const,
    label: "Apresentação",
    description: "Escolha os slides e apresente sem distrações.",
  },
  {
    href: "/configuracoes",
    icon: "tune" as const,
    label: "Configurações",
    description: "Ajuste tema, fundo e cartões.",
  },
];

export function ProfileActionsCard() {
  return (
    <section className="surface-card profile-panel-card">
      <div className="profile-panel-heading">
        <div>
          <p className="profile-eyebrow">ACESSO RÁPIDO</p>
          <h2>Continue sua leitura</h2>
        </div>
      </div>
      <div className="profile-action-list">
        {actions.map((action) => (
          <Link
            className="profile-action-row"
            href={action.href}
            key={action.href}
          >
            <span className="profile-action-icon" aria-hidden="true">
              <Icon name={action.icon} size={17} />
            </span>
            <span>
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </span>
            <Icon name="arrow" size={15} />
          </Link>
        ))}
      </div>
      <div className="profile-help-note">
        <span aria-hidden="true">i</span>
        <p>
          O perfil mostra o acesso atual. Preferências visuais e contraste ficam
          em Configurações.
        </p>
      </div>
    </section>
  );
}
