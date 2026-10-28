"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CampaignBar } from "@/components/dashboard/types";

type CampaignOpeningsCardProps = { campaigns: CampaignBar[]; total: number };
const pageSize = 5;

export function CampaignOpeningsCard({
  campaigns,
  total,
}: CampaignOpeningsCardProps) {
  const [pagination, setPagination] = useState({ filter: "", page: 0 });
  const sorted = [...campaigns].sort(
    (a, b) =>
      b.rate - a.rate || a.name.localeCompare(b.name, "pt-BR") || a.id - b.id,
  );
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const filter = sorted.map((campaign) => campaign.id).join(",");
  const currentPage =
    pagination.filter === filter ? Math.min(pagination.page, pages - 1) : 0;
  const setPage = (page: number) => setPagination({ filter, page });
  const visible = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  return (
    <article className="surface-card campaign-openings-card campaign-clicks-card">
      <div className="campaign-clicks-heading">
        <div>
          <h3>Clicados por campanhas</h3>
          <p>Taxa de cliques · maiores primeiro</p>
        </div>
        <Link href="#campaign-overview" className="campaign-clicks-link">
          Ver campanhas <Icon name="arrow" size={15} />
        </Link>
      </div>
      {visible.length ? (
        <ol
          className="campaign-clicks-ranking"
          aria-label="Campanhas por taxa de cliques"
          start={currentPage * pageSize + 1}
        >
          {visible.map((campaign) => (
            <li key={campaign.id}>
              <div className="campaign-clicks-row-heading">
                <Link href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                <span>
                  {campaign.rate.toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
              </div>
              <div className="campaign-clicks-bar" aria-hidden="true">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, campaign.rate))}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="campaign-clicks-empty" role="status">
          Nenhuma campanha incluída nos indicadores deste filtro.
        </p>
      )}
      <div className="campaign-clicks-footer">
        <span>{total.toLocaleString("pt-BR")} entregas no filtro</span>
        {pages > 1 && (
          <nav
            className="campaign-clicks-pagination"
            aria-label="Páginas do gráfico de cliques"
          >
            <button
              type="button"
              aria-label="Campanhas anteriores"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span aria-live="polite">
              {currentPage + 1} de {pages}
            </span>
            <button
              type="button"
              aria-label="Próximas campanhas"
              disabled={currentPage === pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </div>
      <p className="campaign-clicks-note">
        Cliques ÷ entregas. Sem entregas registradas, a base é o total de
        participações da campanha.
      </p>
    </article>
  );
}
