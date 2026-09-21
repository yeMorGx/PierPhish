export type IconName =
  | "grid"
  | "chart"
  | "users"
  | "shield"
  | "refresh"
  | "arrow"
  | "logout"
  | "chevron"
  | "search"
  | "palette"
  | "image"
  | "settings"
  | "tune"
  | "check"
  | "plus"
  | "close"
  | "bell";

const iconClasses: Record<IconName, string> = {
  grid: "fa-table-cells",
  chart: "fa-chart-line",
  users: "fa-users",
  shield: "fa-shield-halved",
  refresh: "fa-arrows-rotate",
  arrow: "fa-arrow-right",
  logout: "fa-arrow-right-from-bracket",
  chevron: "fa-chevron-down",
  search: "fa-magnifying-glass",
  palette: "fa-palette",
  image: "fa-image",
  settings: "fa-gear",
  tune: "fa-sliders",
  check: "fa-check",
  plus: "fa-plus",
  close: "fa-xmark",
  bell: "fa-bell",
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <i
      aria-hidden="true"
      className={`icon-minimal fa-solid ${iconClasses[name]} shrink-0`}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    />
  );
}
