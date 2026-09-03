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
  title: string;
};

export function DashboardShell({
  activeSection,
  children,
  headerAction,
  title,
}: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sessionEmail = user?.email ?? null;
  const isDashboard = activeSection === "overview";

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
    <main className="theme-canvas flex h-screen min-h-0 flex-col overflow-hidden p-[var(--shell-padding)] transition-all duration-200 max-[1120px]:p-7 max-[720px]:h-auto max-[720px]:min-h-screen max-[720px]:overflow-visible max-[720px]:p-[14px]">
      <section className="flex h-[calc(100vh-112px)] min-h-0 min-w-0 flex-col overflow-visible max-[1120px]:h-[calc(100vh-56px)] max-[720px]:h-auto">
        <header className="surface-card theme-header relative flex h-[var(--header-height)] flex-none items-center justify-between gap-5 rounded-[var(--radius-shell)] px-8 py-3 max-[1120px]:rounded-[45px] max-[720px]:mb-2.5 max-[720px]:h-[118px] max-[720px]:flex-col max-[720px]:items-start max-[720px]:rounded-[23px] max-[720px]:px-[22px] max-[720px]:py-5">
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
            <div className="relative" ref={profileMenuRef}>
              <button
                className="profile-trigger group grid size-10 place-items-center rounded-full text-[13px] font-extrabold transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[#b9c7cf] max-[720px]:size-9"
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
                  className="surface-card profile-menu absolute top-[calc(100%+10px)] right-0 z-50 w-[250px] rounded-[22px] p-2"
                  role="menu"
                >
                  <Link
                    href="/perfil"
                    className="profile-menu-account flex items-center gap-3 rounded-[16px] p-3 transition-colors"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span className="profile-menu-avatar grid size-9 flex-none place-items-center rounded-full text-[11px] font-extrabold">
                      {sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "D"}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-[11px]">
                        {sessionEmail ? "Conta conectada" : "Modo demonstração"}
                      </strong>
                      <span className="mt-0.5 block max-w-[180px] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-[#87919a]">
                        {sessionEmail ?? "Dados locais de demonstração"}
                      </span>
                    </span>
                    <Icon name="arrow" size={15} />
                  </Link>
                  <div className="profile-menu-divider my-2 h-px" />
                  <Link
                    className="profile-menu-link flex w-full items-center gap-2.5 rounded-[13px] px-3 py-2.5 text-left text-[11px] font-bold transition-colors"
                    href="/configuracoes"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Icon name="settings" size={16} />
                    Configurações
                  </Link>
                  <button
                    className="profile-menu-link flex w-full items-center gap-2.5 rounded-[13px] border-0 bg-transparent px-3 py-2.5 text-left text-[11px] font-bold transition-colors"
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
          </div>
        </header>
        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#d9d9d9_transparent] [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain py-[14px] pr-2 max-[720px]:overflow-visible max-[720px]:p-0">
          {children}
        </div>
      </section>
    </main>
  );
}
