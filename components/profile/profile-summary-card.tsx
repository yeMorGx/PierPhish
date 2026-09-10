type ProfileTotals = {
  campaigns: number;
  people: number;
  delivered: number;
  opened: number;
  clicked: number;
  reported: number;
};

type ProfileSummaryCardProps = {
  totals: ProfileTotals;
};

function rate(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function ProfileSummaryCard({ totals }: ProfileSummaryCardProps) {
  const metrics = [
    { label: "Campanhas", value: totals.campaigns, note: "monitoradas" },
    { label: "Pessoas", value: totals.people, note: "impactadas" },
    {
      label: "Abertura",
      value: `${rate(totals.opened, totals.people)}%`,
      note: `${totals.opened} pessoas abriram`,
      progress: rate(totals.opened, totals.people),
    },
    { label: "Reportes", value: totals.reported, note: "sinais recebidos" },
  ];

  return (
    <section className="surface-card profile-panel-card">
      <div className="profile-panel-heading">
        <div>
          <p className="profile-eyebrow">LEITURA DA CONTA</p>
          <h2>O ambiente em números</h2>
        </div>
        <span className="profile-panel-kicker">Todas as campanhas</span>
      </div>
      <div className="profile-stat-grid">
        {metrics.map((metric) => (
          <div className="profile-stat" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
            {metric.progress !== undefined && (
              <span className="profile-stat-track" aria-hidden="true">
                <span style={{ width: `${metric.progress}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="profile-panel-note">
        A leitura é consolidada a partir das campanhas sincronizadas no
        BeePhish.
      </p>
    </section>
  );
}
