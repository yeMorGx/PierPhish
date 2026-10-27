"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type CSSProperties,
} from "react";

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
  children?: ReactNode;
};

function initial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "C";
}

export function DashboardCompanyFilter({
  companies,
  selectedCompanyId,
  onChange,
  showLayoutControl = false,
  children,
}: DashboardCompanyFilterProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  function updateEdges() {
    const list = listRef.current;
    if (!list) return;
    const left = list.scrollLeft > 1;
    const right = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
    setEdges((current) =>
      current.left === left && current.right === right
        ? current
        : { left, right },
    );
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => observer.disconnect();
  }, [companies]);

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      drag.current = null;
      setDragging(false);
      return;
    }
    const distance = event.clientX - current.startX;
    if (!current.moved && Math.abs(distance) < 6) return;
    if (!current.moved) {
      current.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = current.startScroll - distance;
  }

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
          ref={listRef}
          className="dashboard-company-filter-list"
          data-fade-left={edges.left || undefined}
          data-fade-right={edges.right || undefined}
          data-dragging={dragging || undefined}
          role="group"
          aria-label="Filtrar por empresa"
          onScroll={updateEdges}
          onPointerDown={(event) => {
            suppressClick.current = false;
            if (
              event.pointerType === "touch" ||
              event.button !== 0 ||
              event.currentTarget.scrollWidth <= event.currentTarget.clientWidth
            )
              return;
            drag.current = {
              id: event.pointerId,
              startX: event.clientX,
              startScroll: event.currentTarget.scrollLeft,
              moved: false,
            };
          }}
          onPointerMove={moveDrag}
          onPointerUp={() => {
            drag.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            drag.current = null;
            suppressClick.current = false;
            setDragging(false);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            setDragging(false);
          }}
          onClickCapture={(event) => {
            if (suppressClick.current && event.detail > 0) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          <button
            className={`dashboard-company-filter ${selectedCompanyId === "all" ? "is-selected" : ""}`}
            type="button"
            aria-pressed={selectedCompanyId === "all"}
            onClick={() => onChange("all")}
          >
            Todas
          </button>
          {companies.map((company, index) => (
            <button
              className={`dashboard-company-filter ${selectedCompanyId === company.id ? "is-selected" : ""}`}
              type="button"
              aria-pressed={selectedCompanyId === company.id}
              key={company.id}
              style={
                {
                  "--company-enter-index": Math.min(index + 1, 6),
                } as CSSProperties
              }
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

      <div className="dashboard-toolbar-trailing">
        {children}
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
      </div>
    </section>
  );
}
