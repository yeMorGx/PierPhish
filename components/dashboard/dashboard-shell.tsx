"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured } from "@/lib/supabase";

type ActiveSection = "overview" | "profile" | "settings";

type DashboardShellProps = {
  activeSection: ActiveSection;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  selectedCampaignId?: number | null;
  title: string;
};

function navClass(active: boolean) {
  return `sidebar-nav-link ${active ? "is-active" : ""}`;
}

export function DashboardShell({
  activeSection,
  children,
  headerAction,
  selectedCampaignId,
  title,
}: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sessionEmail = user?.email ?? null;
  const isDashboard = activeSection === "overview";
  const campaignsHref = isDashboard ? "#campaign-overview" : "/#campaign-overview";
  const protectionHref = isDashboard ? "#risk-overview" : "/#risk-overview";
  const peopleHref = selectedCampaignId
    ? `/campaigns/${selectedCampaignId}`
    : "/#campaign-overview";

  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      )
        setProfileOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  return (
    <main className="theme-canvas grid h-screen min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-[var(--shell-gap)] overflow-hidden p-[var(--shell-padding)] transition-all duration-200 max-[1120px]:p-7 max-[720px]:h-auto max-[720px]:min-h-screen max-[720px]:grid-cols-1 max-[720px]:gap-2.5 max-[720px]:overflow-visible max-[720px]:p-[14px]">
      <aside
        className="flex h-[calc(100vh-112px)] min-h-0 flex-col gap-[var(--shell-gap)] max-[1120px]:h-[calc(100vh-56px)] max-[720px]:h-[67px] max-[720px]:flex-row max-[720px]:gap-2"
        aria-label="Navegação principal"
      >
        <div
          className="relative grid size-[var(--sidebar-width)] flex-none place-items-center max-[720px]:size-[67px] max-[720px]:basis-[67px]"
          ref={profileMenuRef}
        >
          <button
            className="group grid size-[var(--avatar-size)] place-items-center rounded-full border-1 bg-[var(--ink)] text-[16px] font-extrabold text-white shadow-[0_8px_18px_rgba(24,32,43,0.12)] transition-all duration-200 outline-none hover:border-5 focus-visible:ring-4 focus-visible:ring-[#b9c7cf] max-[720px]:size-[54px]"
            type="button"
            aria-label="Abrir menu do perfil"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            {sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "D"}
          </button>

          {profileOpen && (
            <div
              className="surface-card absolute top-0 left-[calc(100%+12px)] z-50 w-[250px] rounded-[22px] p-2 max-[720px]:top-full max-[720px]:left-0 max-[720px]:mt-2"
              role="menu"
            >
              <Link
                href="/perfil"
                className="flex items-center gap-3 rounded-[16px] bg-[#f5f7f7] p-3 transition-colors hover:bg-[#edf2f3]"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
              >
                <span className="grid size-9 flex-none place-items-center rounded-full bg-[#18202b] text-[11px] font-extrabold text-white">
                  {sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "D"}
                </span>
                <span className="min-w-0">
                  <strong className="block text-[11px] text-[#18202b]">
                    {sessionEmail ? "Conta conectada" : "Modo demonstração"}
                  </strong>
                  <span className="mt-0.5 block max-w-[180px] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-[#87919a]">
                    {sessionEmail ?? "Dados locais de demonstração"}
                  </span>
                </span>
                <Icon name="arrow" size={15} />
              </Link>
              <div className="my-2 h-px bg-[#edf0f1]" />
              <button
                className="flex w-full items-center gap-2.5 rounded-[13px] border-0 bg-transparent px-3 py-2.5 text-left text-[11px] font-bold text-[#66717b] transition-colors hover:bg-[#fff1ed] hover:text-[#a5553b] focus-visible:bg-[#fff1ed] focus-visible:text-[#a5553b]"
                type="button"
                role="menuitem"
                onClick={() => void signOut()}
              >
                <Icon name="logout" size={16} />
                Sair<span className="ml-auto text-[14px] leading-none">↗</span>
              </button>
            </div>
          )}
        </div>

        <div className="surface-card flex min-h-0 flex-1 flex-col justify-between rounded-[var(--radius-shell)] p-4 px-3 max-[1120px]:rounded-[45px] max-[720px]:flex-row max-[720px]:rounded-[23px] max-[720px]:p-[9px_12px]">
          <nav className="mt-[18px] flex flex-col items-center gap-3 max-[720px]:mt-0 max-[720px]:ml-2 max-[720px]:flex-row max-[720px]:gap-[3px]">
            <Link
              href="/"
              className={navClass(activeSection === "overview")}
              aria-label="Visão geral"
              aria-current={activeSection === "overview" ? "page" : undefined}
            >
              <Icon name="grid" />
            </Link>
            <Link
              href={campaignsHref}
              className={navClass(false)}
              aria-label="Campanhas"
            >
              <Icon name="chart" />
            </Link>
            <Link
              href={peopleHref}
              className={`${navClass(false)} max-[720px]:hidden`}
              aria-label="Pessoas"
            >
              <Icon name="users" />
            </Link>
            <Link
              href={protectionHref}
              className={`${navClass(false)} max-[720px]:hidden`}
              aria-label="Proteção"
            >
              <Icon name="shield" />
            </Link>
            <Link
              href="/configuracoes"
              className={`${navClass(activeSection === "settings")} hidden max-[720px]:grid`}
              aria-label="Configurações"
              aria-current={activeSection === "settings" ? "page" : undefined}
            >
              <Icon name="settings" />
            </Link>
          </nav>
          <Link
            href="/configuracoes"
            className={`${navClass(activeSection === "settings")} max-[720px]:hidden`}
            aria-label="Configurações"
            aria-current={activeSection === "settings" ? "page" : undefined}
          >
            <Icon name="settings" />
          </Link>
        </div>
      </aside>

      <section className="flex h-[calc(100vh-112px)] min-h-0 min-w-0 flex-col overflow-hidden max-[1120px]:h-[calc(100vh-56px)] max-[720px]:h-auto">
        <header className="surface-card flex h-[var(--header-height)] flex-none items-center justify-between gap-5 rounded-[var(--radius-shell)] px-8 py-3 max-[1120px]:rounded-[45px] max-[720px]:mb-2.5 max-[720px]:h-[118px] max-[720px]:flex-col max-[720px]:items-start max-[720px]:rounded-[23px] max-[720px]:px-[22px] max-[720px]:py-5">
          <h1 className="m-0 text-[clamp(18px,3vw,24px)] leading-[0.95] font-[680] tracking-[-0.065em]">
            {title}
          </h1>
          <div className="flex items-center gap-2.5 max-[720px]:w-full max-[720px]:justify-between">
            <span className="mr-[7px] inline-flex items-center gap-2 text-[12px] text-[#69717d] max-[720px]:mr-auto">
              <span className="inline-block size-[7px] rounded-full bg-[#9fc52d] shadow-[0_0_0_4px_rgba(159,197,45,0.14)]" />
              {isSupabaseConfigured && sessionEmail
                ? "Dados conectados"
                : "Modo demonstração"}
            </span>
            {headerAction}
          </div>
        </header>
        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#d9d9d9_transparent] [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain py-[14px] pr-2 max-[720px]:overflow-visible max-[720px]:p-0">
          {children}
        </div>
      </section>
    </main>
  );
}
