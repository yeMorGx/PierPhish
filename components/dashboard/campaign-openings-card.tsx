"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ShieldCheck,
  CircleCheck,
  CircleMinus,
  TriangleAlert,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { clickRateLevel } from "@/lib/campaigns/metrics";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CampaignBar } from "@/components/dashboard/types";

type CampaignOpeningsCardProps = { campaigns: CampaignBar[]; total: number };
const pageSize = 3;
const severityIcons: Record<string, LucideIcon> = {
  excellent: ShieldCheck,
  good: CircleCheck,
  acceptable: CircleMinus,
  warning: TriangleAlert,
  critical: OctagonAlert,
};

export function CampaignOpeningsCard({
  campaigns,
  total,
}: CampaignOpeningsCardProps) {
  const reducedMotion = useReducedMotion();
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.ol
            key={`${filter}:${currentPage}`}
            initial={reducedMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
            className="campaign-clicks-ranking"
            aria-label="Campanhas por taxa de cliques"
            start={currentPage * pageSize + 1}
          >
            {visible.map((campaign) => {
              const level = clickRateLevel(campaign.rate);
              const SeverityIcon = severityIcons[level.tone];
              const color =
                level.tone === "critical"
                  ? `color-mix(in oklab, var(--campaign-clicks-critical), var(--campaign-clicks-high) ${Math.min(100, Math.max(0, ((campaign.rate - 15) / 85) * 100))}%)`
                  : `var(--campaign-clicks-${level.tone})`;
              return (
                <li
                  key={campaign.id}
                  style={{ "--campaign-clicks-tone": color } as CSSProperties}
                >
                  <div className="campaign-clicks-row-heading">
                    <Link href={`/campaigns/${campaign.id}`}>
                      {campaign.name}
                    </Link>
                    <span
                      className="campaign-clicks-severity"
                      title={level.label}
                    >
                      <SeverityIcon
                        size={16}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{level.label}: </span>
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
              );
            })}
          </motion.ol>
        </AnimatePresence>
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
    </article>
  );
}
