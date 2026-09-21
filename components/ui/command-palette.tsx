"use client";

import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Moon,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Command } from "cmdk";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/theme-provider";
import { useUiStore } from "@/lib/ui-store";

type CommandItem = {
  label: string;
  hint: string;
  href?: string;
  icon: LucideIcon;
};

const navigationCommands: CommandItem[] = [
  {
    label: "Visão geral",
    hint: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Pessoas por risco",
    hint: "Exposição humana",
    href: "/riscos",
    icon: ShieldCheck,
  },
  {
    label: "Empresas",
    hint: "Clientes e conexões",
    href: "/empresas",
    icon: Building2,
  },
  {
    label: "Usuários",
    hint: "Acessos do ambiente",
    href: "/usuarios",
    icon: Users,
  },
  {
    label: "Apresentação",
    hint: "Resumo visual",
    href: "/apresentacao",
    icon: BarChart3,
  },
  {
    label: "Configurações",
    hint: "Conta e preferências",
    href: "/configuracoes",
    icon: Settings2,
  },
];

export function CommandPalette() {
  const router = useRouter();
  const { preferences, setMode } = useTheme();
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        className="command-palette-trigger"
        onClick={() => setOpen(true)}
        aria-label="Abrir paleta de comandos"
      >
        <Search aria-hidden="true" size={16} strokeWidth={1.7} />
        <span className="max-[840px]:hidden">Buscar</span>
        <kbd>⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Paleta de comandos"
        className="command-palette-dialog"
      >
        <div className="command-palette-heading">
          <Search aria-hidden="true" size={17} strokeWidth={1.7} />
          <Command.Input placeholder="Ir para uma área ou ação..." />
          <button
            type="button"
            className="command-palette-escape"
            onClick={() => setOpen(false)}
            aria-label="Fechar paleta de comandos"
          >
            Esc
          </button>
        </div>
        <Command.List>
          <Command.Empty>Nenhum resultado encontrado.</Command.Empty>
          <Command.Group heading="Navegação">
            {navigationCommands.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.hint}`}
                  onSelect={() => item.href && navigate(item.href)}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </Command.Item>
              );
            })}
          </Command.Group>
          <Command.Group heading="Preferências">
            <Command.Item
              value="alternar tema claro escuro aparência"
              onSelect={() => {
                setMode(preferences.mode === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              {preferences.mode === "dark" ? (
                <Sun aria-hidden="true" size={17} strokeWidth={1.7} />
              ) : (
                <Moon aria-hidden="true" size={17} strokeWidth={1.7} />
              )}
              <span>
                Usar tema {preferences.mode === "dark" ? "claro" : "escuro"}
              </span>
              <small>
                <Palette aria-hidden="true" size={14} strokeWidth={1.7} />
              </small>
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="command-palette-footer">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc fechar</span>
        </div>
      </Command.Dialog>
    </>
  );
}
