"use client";

import { Icon } from "@/components/ui/icon";
import { useUiStore } from "@/lib/ui-store";

export type DashboardCompanyFilterOption = {
  id: string;
  name: string;
  logoUrl: string | null;
  campaignCount: number;
};

type DashboardCompanyFilterProps = {
  companies: DashboardCompanyFilterOption[];
  selectedCompanyId: string;
  onChange: (companyId: string) => void;
  showLayoutControl?: boolean;
};

function initial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "C";
}

export function DashboardCompanyFilter({
  companies,
  selectedCompanyId,
  onChange,
  showLayoutControl = false,
}: DashboardCompanyFilterProps) {
  const dashboardEditMode = useUiStore((state) => state.dashboardEditMode);
  const setDashboardEditMode = useUiStore(
    (state) => state.setDashboardEditMode,
  );
  const resetDashboardLayout = useUiStore(
    (state) => state.resetDashboardLayout,
  );

  return (
    <section
      data-tour="dashboard-filter"
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

      {showLayoutControl && (
        <div className="dashboard-toolbar-actions">
          {dashboardEditMode && (
            <button
              className="visual-dashboard-editor-reset"
              type="button"
              onClick={resetDashboardLayout}
            >
              Restaurar
            </button>
          )}
          <button
            className={`visual-dashboard-editor-toggle ${dashboardEditMode ? "is-active" : ""}`}
            type="button"
            aria-pressed={dashboardEditMode}
            onClick={() => setDashboardEditMode(!dashboardEditMode)}
          >
            <Icon name="tune" size={14} />
            {dashboardEditMode ? "Concluir" : "Personalizar"}
          </button>
        </div>
      )}
    </section>
  );
}
