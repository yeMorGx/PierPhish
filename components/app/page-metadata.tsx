"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readLocalWorkspaces } from "@/lib/company-data";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";

const productName = "PierPhish";

function pageTitle(pathname: string) {
  if (pathname === "/") return "Visão geral";
  if (pathname.startsWith("/campaigns/")) return "Campanha";

  const titles: Record<string, string> = {
    "/alterar-senha": "Alterar senha",
    "/apresentacao": "Apresentação",
    "/configuracoes": "Configurações",
    "/empresas": "Empresas",
    "/campanhas": "Campanhas",
    "/campanhas/nova": "Nova campanha",
    "/campanhas/grupos": "Grupos de campanha",
    "/campanhas/atividade": "Atividade de campanhas",
    "/campanhas/conexao": "Conexão de campanhas",
    "/login": "Entrar",
    "/mfa": "Verificação MFA",
    "/politica-de-cookies": "Política de cookies",
    "/riscos": "Pessoas por risco",
    "/status": "Status do ambiente",
    "/usuarios": "Usuários",
    "/workspaces": "Workspaces",
  };

  return titles[pathname] ?? productName;
}

function isWorkspaceAwarePage(pathname: string) {
  return !["/alterar-senha", "/login", "/mfa", "/politica-de-cookies"].includes(
    pathname,
  );
}

export function PageMetadata() {
  const pathname = usePathname();
  const activeWorkspaceId = useActiveWorkspaceId();
  const [workspaceRevision, setWorkspaceRevision] = useState(0);

  useEffect(() => {
    function refreshWorkspaceMetadata() {
      setWorkspaceRevision((revision) => revision + 1);
    }

    window.addEventListener(
      "pierphish:workspaces-changed",
      refreshWorkspaceMetadata,
    );
    return () =>
      window.removeEventListener(
        "pierphish:workspaces-changed",
        refreshWorkspaceMetadata,
      );
  }, []);

  useEffect(() => {
    const currentPageTitle = pageTitle(pathname);
    const activeWorkspace = isWorkspaceAwarePage(pathname)
      ? readLocalWorkspaces().find(
          (workspace) => workspace.id === activeWorkspaceId,
        )
      : null;

    document.title = activeWorkspace
      ? `${currentPageTitle} · ${activeWorkspace.name}`
      : `${currentPageTitle} · ${productName}`;
  }, [activeWorkspaceId, pathname, workspaceRevision]);

  return null;
}
