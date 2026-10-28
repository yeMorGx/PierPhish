import type { CampaignSummary } from "./types";

export function CompanySignalsChart({
  campaigns,
  companies,
}: {
  campaigns: CampaignSummary[];
  companies: { id: string; name: string }[];
}) {
  const groups = new Map<
    string,
    { name: string; clicked: number; reported: number }
  >();
  for (const campaign of campaigns) {
    const key = campaign.company_id ?? "unknown";
    const group = groups.get(key) ?? {
      name:
        companies.find((c) => c.id === key)?.name ?? "Empresa não informada",
      clicked: 0,
      reported: 0,
    };
    group.clicked += campaign.clickedPeople;
    group.reported += campaign.reportedPeople;
    groups.set(key, group);
  }
  const rows = [...groups]
    .sort(
      (a, b) =>
        b[1].clicked - a[1].clicked ||
        a[1].name.localeCompare(b[1].name, "pt-BR"),
    )
    .slice(0, 4);
  const max = Math.max(1, ...rows.flatMap(([, r]) => [r.clicked, r.reported]));
  return (
    <article className="surface-card company-signals-chart">
      <h3>Cliques e reportes por empresa</h3>
      <p>Onde há mais interações e mensagens reportadas.</p>
      <div className="company-signals-legend">
        <span>Cliques</span>
        <span>Reportes</span>
      </div>
      <ul>
        {rows.map(([id, row]) => (
          <li key={id}>
            <strong>{row.name}</strong>
            <div className="company-signal-line">
              <span>Cliques</span>
              <div aria-hidden="true">
                <i style={{ width: `${(row.clicked / max) * 100}%` }} />
              </div>
              <b>{row.clicked.toLocaleString("pt-BR")}</b>
            </div>
            <div className="company-signal-line is-report">
              <span>Reportes</span>
              <div aria-hidden="true">
                <i style={{ width: `${(row.reported / max) * 100}%` }} />
              </div>
              <b>{row.reported.toLocaleString("pt-BR")}</b>
            </div>
          </li>
        ))}
      </ul>
      {!rows.length && <p>Nenhuma campanha neste filtro.</p>}
      <p className="company-signals-note">
        Até 4 empresas com mais cliques. Contagens por campanha; uma pessoa pode
        aparecer mais de uma vez.
      </p>
    </article>
  );
}
