import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type ProfileHeroProps = {
  email: string;
  initial: string;
  lastSync: string | null;
};

export function ProfileHero({ email, initial, lastSync }: ProfileHeroProps) {
  return (
    <section className="surface-card profile-hero-card">
      <div className="profile-hero-orbit profile-hero-orbit-large" />
      <div className="profile-hero-orbit profile-hero-orbit-small" />
      <div className="profile-hero-layout">
        <div className="profile-hero-identity">
          <div className="profile-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="profile-hero-copy">
            <p className="profile-eyebrow">CONTA CONECTADA</p>
            <h2>Seu acesso ao Lens.</h2>
            <p>{email}</p>
          </div>
        </div>
        <Link className="profile-hero-action" href="/configuracoes">
          Ajustar espaço
          <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="profile-hero-footer">
        <span className="profile-live-status">
          <span aria-hidden="true" /> Acesso ativo
        </span>
        <span>Última sincronização: {lastSync ?? "aguardando dados"}</span>
      </div>
    </section>
  );
}
