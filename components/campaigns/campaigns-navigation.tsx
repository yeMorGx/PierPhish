import Link from "next/link";

export type CampaignPageView =
  | "overview"
  | "campaigns"
  | "new"
  | "groups"
  | "templates"
  | "pages"
  | "sendingProfiles"
  | "activity"
  | "connection";

const items = [
  { view: "overview", href: "/campanhas/visao-geral", label: "Visão geral" },
  { view: "campaigns", href: "/campanhas", label: "Campanhas" },
  { view: "groups", href: "/campanhas/grupos", label: "Grupos" },
  {
    view: "templates",
    href: "/campanhas/modelos",
    label: "Modelos de e-mail",
  },
  {
    view: "pages",
    href: "/campanhas/paginas",
    label: "Páginas de destino",
  },
  {
    view: "sendingProfiles",
    href: "/campanhas/envio",
    label: "Perfis de envio",
  },
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
      className="flex min-w-0 flex-wrap gap-x-1 border-b border-[var(--line-soft)] px-1"
    >
      {items.map((item) => {
        const active = item.view === activeView;
        return (
          <Link
            key={item.view}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative -mb-px flex-none px-3 py-3 text-[12px] font-semibold transition-colors ${active ? "border-b-2 border-[var(--ink)] text-[var(--ink)]" : "text-[var(--text-muted)] hover:text-[var(--ink)]"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
