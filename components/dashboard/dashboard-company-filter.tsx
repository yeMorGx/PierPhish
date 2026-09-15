"use client";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Icon } from "@/components/ui/icon";

export type DashboardCompanyFilterOption = {
  id: string;
  name: string;
  logoUrl: string | null;
  campaignCount: number;
};

type DashboardAttachedImage = {
  id: number;
  name: string;
  src: string;
};

type DashboardCompanyFilterProps = {
  companies: DashboardCompanyFilterOption[];
  selectedCompanyId: string;
  onChange: (companyId: string) => void;
  clickRate: number;
  attachedImages: DashboardAttachedImage[];
};

function initial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "C";
}

export function DashboardCompanyFilter({
  companies,
  selectedCompanyId,
  onChange,
  clickRate,
  attachedImages,
}: DashboardCompanyFilterProps) {
  return (
    <section
      className="dashboard-toolbar"
      aria-label="Filtros e resumo do relatório"
    >
      <div className="dashboard-company-filters">
        <span className="dashboard-toolbar-label">Empresas</span>
        <div
          className="dashboard-company-filter-list"
          role="group"
          aria-label="Filtrar por empresa"
        >
          <button
            className={`dashboard-company-filter ${selectedCompanyId === "all" ? "is-selected" : ""}`}
            type="button"
            aria-pressed={selectedCompanyId === "all"}
            onClick={() => onChange("all")}
          >
            Todas
          </button>
          {companies.map((company) => (
            <button
              className={`dashboard-company-filter ${selectedCompanyId === company.id ? "is-selected" : ""}`}
              type="button"
              aria-pressed={selectedCompanyId === company.id}
              key={company.id}
              onClick={() => onChange(company.id)}
              title={`${company.name} · ${company.campaignCount} campanhas`}
            >
              <span className="dashboard-company-filter-logo">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" />
                ) : (
                  initial(company.name)
                )}
              </span>
              <span>{company.name}</span>
              <small>{company.campaignCount}</small>
            </button>
          ))}
        </div>
      </div>

      <div
        className="dashboard-report-facts"
        aria-label="Informações para o relatório"
      >
        <div className="dashboard-report-fact">
          <span>Taxa de cliques</span>
          <strong>
            <AnimatedNumber value={clickRate} suffix="%" />
          </strong>
          <small>cliques / entregues</small>
        </div>
        <div className="dashboard-report-fact dashboard-report-images">
          <span>Imagens anexadas</span>
          <strong>
            <AnimatedNumber value={attachedImages.length} />
          </strong>
          <div
            className="dashboard-report-thumbnails"
            aria-label={`${attachedImages.length} imagens de campanha anexadas`}
          >
            {attachedImages.slice(0, 4).map((image) => (
              <img src={image.src} alt={image.name} key={image.id} />
            ))}
            {!attachedImages.length && <Icon name="image" size={14} />}
          </div>
        </div>
      </div>
    </section>
  );
}
