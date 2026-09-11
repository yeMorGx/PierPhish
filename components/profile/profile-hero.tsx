import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type ProfileHeroProps = {
  avatar: string | null;
  displayName: string;
  email: string;
  initial: string;
  lastSync: string | null;
};

export function ProfileHero({
  avatar,
  displayName,
  email,
  initial,
  lastSync,
}: ProfileHeroProps) {
  return (
    <section className="surface-card profile-hero-card">
      <div className="profile-hero-layout">
        <div className="profile-hero-identity">
          <div className="profile-avatar overflow-hidden" aria-hidden="true">
            {avatar ? (
              <img className="size-full object-cover" src={avatar} alt="" />
            ) : (
              initial
            )}
          </div>
          <div className="profile-hero-copy">
            <p className="profile-eyebrow">PERFIL NO PIERPHISH</p>
            <h2>{displayName || "Seu espaço no PierPhish."}</h2>
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
