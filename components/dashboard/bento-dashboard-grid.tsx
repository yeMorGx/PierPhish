"use client";

import { Children, isValidElement, useMemo } from "react";
import {
  Responsive,
  WidthProvider,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import { Icon } from "@/components/ui/icon";
import {
  type DashboardLayoutItem,
  type DashboardWidgetId,
  useUiStore,
} from "@/lib/ui-store";

const ResponsiveGridLayout = WidthProvider(Responsive);

type BentoDashboardGridProps = {
  children: React.ReactNode;
};

function normalizeLayouts(layouts: ResponsiveLayouts) {
  return Object.fromEntries(
    Object.entries(layouts).map(([breakpoint, items]) => [
      breakpoint,
      (items ?? []).map((item) => ({
        i: item.i as DashboardWidgetId,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      })),
    ]),
  ) as Record<string, DashboardLayoutItem[]>;
}

function applyWidgetOrder(
  layouts: Record<string, DashboardLayoutItem[]>,
  order: DashboardWidgetId[],
) {
  return Object.fromEntries(
    Object.entries(layouts).map(([breakpoint, items]) => {
      const positions = [...items].sort(
        (first, second) => first.y - second.y || first.x - second.x,
      );
      const layout = order.flatMap((id, index) => {
        const current = items.find((item) => item.i === id);
        const position = positions[index];
        if (!current || !position) return [];
        return [
          {
            ...current,
            x: position.x,
            y: position.y,
            w: position.w,
            h: position.h,
          },
        ];
      });
      return [breakpoint, layout];
    }),
  ) as Record<string, DashboardLayoutItem[]>;
}

export function BentoDashboardGrid({ children }: BentoDashboardGridProps) {
  const dashboardLayouts = useUiStore((state) => state.dashboardLayouts);
  const dashboardWidgetOrder = useUiStore(
    (state) => state.dashboardWidgetOrder,
  );
  const dashboardEditMode = useUiStore((state) => state.dashboardEditMode);
  const setDashboardLayouts = useUiStore((state) => state.setDashboardLayouts);
  const setDashboardEditMode = useUiStore(
    (state) => state.setDashboardEditMode,
  );
  const resetDashboardLayout = useUiStore(
    (state) => state.resetDashboardLayout,
  );
  const widgets = useMemo(
    () =>
      Children.toArray(children).flatMap((child) => {
        if (!isValidElement(child)) return [];
        const id = (child.props as { "data-widget-id"?: unknown })[
          "data-widget-id"
        ];
        return typeof id === "string"
          ? [{ id: id as DashboardWidgetId, content: child }]
          : [];
      }),
    [children],
  );

  const orderedWidgets = useMemo(
    () =>
      [...widgets].sort(
        (first, second) =>
          dashboardWidgetOrder.indexOf(first.id) -
          dashboardWidgetOrder.indexOf(second.id),
      ),
    [dashboardWidgetOrder, widgets],
  );
  const orderedLayouts = useMemo(
    () => applyWidgetOrder(dashboardLayouts, dashboardWidgetOrder),
    [dashboardLayouts, dashboardWidgetOrder],
  );

  function handleLayoutChange(_layout: unknown, layouts: ResponsiveLayouts) {
    setDashboardLayouts(normalizeLayouts(layouts));
  }

  return (
    <div className="visual-dashboard-editor">
      <div className="visual-dashboard-editor-toolbar">
        <span>
          {dashboardEditMode
            ? "Arraste ou redimensione os módulos."
            : "Layout visual"}
        </span>
        <div>
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
      </div>
      <ResponsiveGridLayout
        className="visual-dashboard"
        layouts={orderedLayouts as ResponsiveLayouts}
        breakpoints={{ lg: 1120, md: 860, sm: 620, xs: 420 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={16}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        isDraggable={dashboardEditMode}
        isResizable={dashboardEditMode}
        draggableCancel="a,button,input,select,textarea"
        onLayoutChange={handleLayoutChange}
      >
        {orderedWidgets.map((widget) => (
          <div className="visual-dashboard-grid-item" key={widget.id}>
            {widget.content}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
