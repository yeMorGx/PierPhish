import Link from "next/link";

export type CampaignPageView =
  | "campaigns"
  | "new"
  | "groups"
  | "templates"
  | "pages"
  | "sendingProfiles"
  | "activity"
  | "connection";

const items = [
  { view: "campaigns", href: "/campanhas", label: "Campanhas" },
  { view: "groups", href: "/campanhas/grupos", label: "Grupos" },
  { view: "templates", href: "/campanhas/modelos", label: "Modelos" },
  { view: "pages", href: "/campanhas/paginas", label: "Páginas" },
  { view: "sendingProfiles", href: "/campanhas/envio", label: "Envio" },
  { view: "activity", href: "/campanhas/atividade", label: "Atividade" },
  { view: "connection", href: "/campanhas/conexao", label: "Conexão" },
] as const;

export function CampaignsNavigation({
  current,
}: {
  current: CampaignPageView;
}) {
  const activeView = current === "new" ? "campaigns" : current;

  return (
    <nav
      aria-label="Áreas de campanhas"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-[var(--line-soft)] px-1"
    >
      {items.map((item) => {
        const active = item.view === activeView;
        return (
          <Link
            key={item.view}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative -mb-px flex-none px-3 py-3 text-[12px] font-semibold transition-colors ${active ? "border-b-2 border-[var(--ink)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
