import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DashboardWidgetId =
  | "hero"
  | "metrics"
  | "chart"
  | "risk"
  | "campaigns";

export type DashboardLayoutItem = {
  i: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type DashboardLayouts = Record<string, DashboardLayoutItem[]>;

export const defaultDashboardWidgetOrder: DashboardWidgetId[] = [
  "hero",
  "metrics",
  "chart",
  "risk",
  "campaigns",
];

export const defaultDashboardLayouts: DashboardLayouts = {
  lg: [
    { i: "hero", x: 0, y: 0, w: 8, h: 11, minW: 5, minH: 8 },
    { i: "metrics", x: 8, y: 0, w: 4, h: 11, minW: 3, minH: 8 },
    { i: "chart", x: 0, y: 11, w: 8, h: 9, minW: 5, minH: 7 },
    { i: "risk", x: 8, y: 11, w: 4, h: 9, minW: 3, minH: 7 },
    { i: "campaigns", x: 0, y: 20, w: 12, h: 10, minW: 6, minH: 7 },
  ],
  md: [
    { i: "hero", x: 0, y: 0, w: 6, h: 11, minW: 4, minH: 8 },
    { i: "metrics", x: 6, y: 0, w: 4, h: 11, minW: 3, minH: 8 },
    { i: "chart", x: 0, y: 11, w: 6, h: 9, minW: 4, minH: 7 },
    { i: "risk", x: 6, y: 11, w: 4, h: 9, minW: 3, minH: 7 },
    { i: "campaigns", x: 0, y: 20, w: 10, h: 10, minW: 5, minH: 7 },
  ],
  sm: [
    { i: "hero", x: 0, y: 0, w: 6, h: 11, minW: 4, minH: 8 },
    { i: "metrics", x: 0, y: 11, w: 6, h: 10, minW: 4, minH: 8 },
    { i: "chart", x: 0, y: 21, w: 6, h: 9, minW: 4, minH: 7 },
    { i: "risk", x: 0, y: 30, w: 6, h: 9, minW: 4, minH: 7 },
    { i: "campaigns", x: 0, y: 39, w: 6, h: 11, minW: 4, minH: 7 },
  ],
};

type UiStore = {
  commandPaletteOpen: boolean;
  dashboardEditMode: boolean;
  dashboardLayouts: DashboardLayouts;
  dashboardWidgetOrder: DashboardWidgetId[];
  setCommandPaletteOpen: (open: boolean) => void;
  setDashboardEditMode: (open: boolean) => void;
  setDashboardLayouts: (layouts: DashboardLayouts) => void;
  setDashboardWidgetOrder: (order: DashboardWidgetId[]) => void;
  resetDashboardLayout: () => void;
  toggleCommandPalette: () => void;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      dashboardEditMode: false,
      dashboardLayouts: defaultDashboardLayouts,
      dashboardWidgetOrder: defaultDashboardWidgetOrder,
      setCommandPaletteOpen: (commandPaletteOpen) =>
        set({ commandPaletteOpen }),
      setDashboardEditMode: (dashboardEditMode) => set({ dashboardEditMode }),
      setDashboardLayouts: (dashboardLayouts) => set({ dashboardLayouts }),
      setDashboardWidgetOrder: (dashboardWidgetOrder) =>
        set({ dashboardWidgetOrder }),
      resetDashboardLayout: () =>
        set({
          dashboardLayouts: defaultDashboardLayouts,
          dashboardWidgetOrder: defaultDashboardWidgetOrder,
        }),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    }),
    {
      name: "pierphish-ui-preferences",
      partialize: ({ dashboardLayouts, dashboardWidgetOrder }) => ({
        dashboardLayouts,
        dashboardWidgetOrder,
      }),
    },
  ),
);
