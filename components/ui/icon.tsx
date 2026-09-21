import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Grid2X2,
  Image as ImageIcon,
  LogOut,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

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

const iconComponents: Record<IconName, LucideIcon> = {
  grid: Grid2X2,
  chart: ChartNoAxesCombined,
  users: UsersRound,
  shield: ShieldCheck,
  refresh: RefreshCw,
  arrow: ArrowRight,
  logout: LogOut,
  chevron: ChevronDown,
  search: Search,
  palette: Palette,
  image: ImageIcon,
  settings: Settings,
  tune: SlidersHorizontal,
  check: Check,
  plus: Plus,
  close: X,
  bell: Bell,
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const IconComponent = iconComponents[name];

  return (
    <IconComponent
      aria-hidden="true"
      className={`icon-minimal shrink-0 ${className ?? ""}`}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
