import { Icon } from "@/components/ui/icon";

type ProfileIdentityCardProps = {
  email: string;
  lastSignIn: string | null;
};

export function ProfileIdentityCard({
  email,
  lastSignIn,
}: ProfileIdentityCardProps) {
  return (
    <section className="surface-card profile-panel-card">
      <div className="profile-panel-heading">
        <div>
          <p className="profile-eyebrow">IDENTIDADE</p>
          <h2>Dados da conta</h2>
        </div>
        <Icon name="shield" size={19} />
      </div>
      <div className="profile-detail-list">
        <div className="profile-detail-row">
          <span className="profile-detail-icon" aria-hidden="true">
            <Icon name="users" size={17} />
          </span>
          <div>
            <span>E-mail de acesso</span>
            <strong>{email}</strong>
          </div>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-icon" aria-hidden="true">
            <Icon name="shield" size={17} />
          </span>
          <div>
            <span>Permissão</span>
            <strong>Administrador interno</strong>
          </div>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-icon" aria-hidden="true">
            <Icon name="refresh" size={17} />
          </span>
          <div>
            <span>Último acesso</span>
            <strong>{lastSignIn ?? "Sessão atual"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
