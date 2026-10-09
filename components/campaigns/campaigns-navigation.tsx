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

const groups = [
  {
    label: "Acompanhar",
    items: [
      {
        view: "overview",
        href: "/campanhas/visao-geral",
        label: "Visão geral",
      },
      { view: "campaigns", href: "/campanhas", label: "Campanhas" },
      { view: "activity", href: "/campanhas/atividade", label: "Atividade" },
    ],
  },
  {
    label: "Preparar",
    items: [
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
    ],
  },
  {
    label: "Configurar",
    items: [
      { view: "connection", href: "/campanhas/conexao", label: "Conexão" },
    ],
  },
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
      className="grid min-w-0 gap-x-8 gap-y-4 border-b border-[var(--line-soft)] py-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_0.6fr]"
    >
      {groups.map((group) => (
        <div
          aria-label={group.label}
          className="min-w-0"
          key={group.label}
          role="group"
        >
          <span className="block px-2.5 text-[11px] font-semibold tracking-[0.05em] text-[var(--text-muted)] uppercase">
            {group.label}
          </span>
          <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5">
            {group.items.map((item) => {
              const active = item.view === activeView;
              return (
                <Link
                  key={item.view}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[var(--radius-control)] px-2.5 py-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${active ? "font-semibold text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-4" : "text-[var(--text-muted)] hover:text-[var(--ink)]"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
