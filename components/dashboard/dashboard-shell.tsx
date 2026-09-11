"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useProfile } from "@/components/profile/profile-provider";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  connectedWorkspace,
  WorkspaceSwitcher,
} from "@/components/workspace/workspace-switcher";

type ActiveSection =
  | "overview"
  | "profile"
  | "risk"
  | "settings"
  | "presentation";
type DashboardShellProps = {
  activeSection: ActiveSection;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  title: string;
};
const navigation: {
  id: ActiveSection;
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { id: "overview", href: "/", label: "Visão geral", icon: "chart" },
  { id: "risk", href: "/riscos", label: "Pessoas por risco", icon: "users" },
  {
    id: "presentation",
    href: "/apresentacao",
    label: "Apresentação",
    icon: "screen",
  },
];

export function DashboardShell({
  activeSection,
  children,
  headerAction,
  title,
}: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const { preferences } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const name =
    preferences.displayName.trim() ||
    user?.email?.split("@")[0] ||
    "Meu perfil";
  const initial = name.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;
    profileMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus();
    function outside(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = Array.from(
          profileMenuRef.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]',
          ) ?? [],
        );
        const index = items.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        items[
          (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length
        ]?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [profileOpen]);

  return (
    <main className="theme-canvas dashboard-shell neo-shell">
      <a href="#page-content" className="neo-skip-link">
        Pular para o conteúdo
      </a>
      <aside className="neo-sidebar" aria-label="Navegação principal">
        <Link
          className="neo-brand"
          href="/"
          aria-label="PierPhish — Visão geral"
        >
          <span className="neo-brand-symbol" aria-hidden="true">
            <Icon name="shield" size={28} />
          </span>
          <span>
            Pier<span>Phish</span>
            <small>Risco humano, em foco.</small>
          </span>
        </Link>
        <button
          className="neo-workspace"
          type="button"
          onClick={() => setWorkspaceOpen(true)}
          aria-label="Trocar workspace"
        >
          <Icon name="grid" size={17} />
          <span>
            <small>WORKSPACE</small>
            <strong>{connectedWorkspace.name}</strong>
          </span>
          <Icon name="chevron" size={15} />
        </button>
        <span className="neo-nav-label">PAINEL DE CONTROLE</span>
        <nav className="neo-nav">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="neo-nav-item"
              aria-label={item.label}
              aria-current={activeSection === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.label}</span>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
        </nav>
        <div className="neo-sidebar-bottom">
          <Link
            href="/configuracoes"
            className="neo-nav-item"
            aria-label="Configurações"
            aria-current={activeSection === "settings" ? "page" : undefined}
          >
            <Icon name="tune" size={21} />
            <span>Configurações</span>
            <Icon name="arrow" size={16} />
          </Link>
          <div className="neo-account" ref={profileMenuRef}>
            <button
              ref={profileButtonRef}
              className="neo-account-button"
              type="button"
              aria-label={`Abrir menu do perfil de ${name}`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <span className="neo-avatar">
                {preferences.avatar ? (
                  <img src={preferences.avatar} alt="" />
                ) : (
                  initial
                )}
              </span>
              <span className="neo-account-copy">
                <strong>{name}</strong>
                <small>Minha conta</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
            {profileOpen && (
              <div
                className="neo-account-menu"
                role="menu"
                aria-label="Menu da conta"
              >
                <p>{user?.email ?? "Modo demonstração"}</p>
                <Link
                  href="/perfil"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <Icon name="users" size={18} />
                  Meu perfil
                  <Icon name="arrow" size={16} />
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    setWorkspaceOpen(true);
                  }}
                >
                  <Icon name="grid" size={18} />
                  Trocar workspace
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="neo-signout"
                  onClick={() => void signOut()}
                >
                  <Icon name="logout" size={18} />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <section className="neo-main">
        <header className="neo-header">
          <div className="neo-header-copy">
            <span>
              PIERPHISH <b>/</b> PAINEL
            </span>
            <h1>{title}</h1>
          </div>
          <div className="neo-header-actions">{headerAction}</div>
        </header>
        <div className="neo-page-content" id="page-content" tabIndex={-1}>
          {children}
        </div>
      </section>
      <WorkspaceSwitcher
        onClose={() => setWorkspaceOpen(false)}
        open={workspaceOpen}
      />
    </main>
  );
}
