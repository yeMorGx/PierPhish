"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { CampaignsNavigation } from "@/components/campaigns/campaigns-navigation";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";

type AssetSection = "templates" | "pages" | "sendingProfiles";
type Connector = {
  id: string;
  name: string;
  online: boolean;
  snapshot?: {
    templates?: Array<{ id: number; name: string; modifiedDate: string }>;
    pages?: Array<{
      id: number;
      name: string;
      captureCredentials: boolean | null;
      capturePasswords: boolean | null;
      modifiedDate: string;
    }>;
    sendingProfiles?: Array<{ id: number; name: string; modifiedDate: string }>;
  };
};
type Operation = {
  id: string;
  type: string;
  name: string;
  itemCount: number;
  requestedBy: string;
  status: string;
  queuedAt: string;
  finishedAt: string | null;
  result: string | null;
};
type AssetSummary = {
  id: number;
  name: string;
  modifiedDate: string;
  captureCredentials?: boolean | null;
  capturePasswords?: boolean | null;
};

const settings: Record<
  AssetSection,
  { title: string; singular: string; href: string }
> = {
  templates: {
    title: "Modelos de e-mail",
    singular: "modelo",
    href: "/campanhas/modelos/novo",
  },
  pages: {
    title: "Páginas de destino",
    singular: "página",
    href: "/campanhas/paginas/nova",
  },
  sendingProfiles: {
    title: "Perfis de envio",
    singular: "perfil",
    href: "/campanhas/envio/novo",
  },
};

function errorMessage(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function dateFormat(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case "queued":
      return "Na fila";
    case "processing":
      return "Em execução";
    case "succeeded":
      return "Criado";
    case "failed":
      return "Falhou";
    case "uncertain":
      return "Verificação necessária";
    case "expired":
      return "Expirou";
    default:
      return status;
  }
}

export function CampaignAssetsContent({ section }: { section: AssetSection }) {
  const { session } = useAuth();
  const workspaceId = useActiveWorkspaceId();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = settings[section];
  const refresh = useCallback(async () => {
    if (!session?.access_token || !isSupabaseConfigured) {
      setConnectors([]);
      setOperations([]);
      setLoading(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const query = `workspaceId=${encodeURIComponent(workspaceId)}`;
      const [connectionResponse, operationResponse] = await Promise.all([
        fetch(`/api/campaigns/connection?${query}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`/api/campaigns/assets?${query}`, { headers, cache: "no-store" }),
      ]);
      const [connectionBody, operationBody] = await Promise.all([
        connectionResponse.json().catch(() => ({})),
        operationResponse.json().catch(() => ({})),
      ]);
      if (!connectionResponse.ok)
        throw new Error(
          errorMessage(connectionBody, "Não foi possível carregar o ambiente."),
        );
      if (!operationResponse.ok)
        throw new Error(
          errorMessage(operationBody, "Não foi possível carregar a atividade."),
        );
      setConnectors(connectionBody.connectors ?? []);
      setOperations(operationBody.operations ?? []);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os ativos.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, workspaceId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const connected = connectors.find((connector) => connector.online) ?? null;
  const assets: AssetSummary[] =
    connected?.snapshot?.[section] ?? connectors[0]?.snapshot?.[section] ?? [];
  const relevantOperations = operations.filter((operation) =>
    section === "templates"
      ? operation.type === "template"
      : section === "pages"
        ? operation.type === "page"
        : operation.type === "sending_profile",
  );

  return (
    <DashboardShell
      activeSection="campaigns"
      title={config.title}
      headerAction={
        <Link
          href={config.href}
          className="campaign-primary-action inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-bold transition-colors"
        >
          Novo {config.singular}
        </Link>
      }
    >
      <div className="grid gap-4">
        <CampaignsNavigation current={section} />
        {error && (
          <p
            role="alert"
            className="m-0 rounded-[12px] border border-[#ead5d5] bg-[#fff7f7] px-4 py-3 text-[12px] text-[#8b3d3d]"
          >
            {error}
          </p>
        )}
        <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
            <div>
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.03em]">
                {config.title}
              </h2>
              <p className="mt-1 mb-0 text-[11px] text-[var(--muted)]">
                Ativos disponíveis para montar uma campanha dentro do PierSec.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${connected ? "bg-[#e8f4ed] text-[#28744c]" : "bg-[var(--surface-soft)] text-[var(--muted)]"}`}
            >
              {connected ? "Ambiente conectado" : "Sem conexão ativa"}
            </span>
          </div>
          {assets.length ? (
            <div className="divide-y divide-[var(--line-soft)]">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-[12px] text-[var(--ink)]">
                      {asset.name}
                    </strong>
                    {section === "pages" && (
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">
                        {asset.captureCredentials === false &&
                        asset.capturePasswords === false
                          ? "Sem captura de credenciais"
                          : "Bloqueada para campanhas"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">
                    Atualizado {dateFormat(asset.modifiedDate)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-9 text-center">
              <strong className="block text-[12px] text-[var(--ink)]">
                {loading
                  ? "Carregando ativos…"
                  : `Nenhum ${config.singular} disponível`}
              </strong>
              <p className="mx-auto mt-2 mb-0 max-w-[440px] text-[11px] leading-relaxed text-[var(--muted)]">
                {connected
                  ? `Crie o primeiro ${config.singular} pelo PierSec para usá-lo nas campanhas.`
                  : "Conecte um ambiente de campanhas para criar e sincronizar ativos."}
              </p>
              {!connected && (
                <Link
                  href="/campanhas/conexao"
                  className="mt-3 inline-flex text-[11px] font-bold text-[var(--ink)] underline underline-offset-4"
                >
                  Abrir conexão
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
          <div className="border-b border-[var(--line-soft)] px-5 py-4">
            <h2 className="m-0 text-[14px] font-semibold tracking-[-0.02em]">
              Atividade recente
            </h2>
            <p className="mt-1 mb-0 text-[11px] text-[var(--muted)]">
              Registro do pedido, responsável, horário e resultado. Conteúdo e
              segredos não aparecem no histórico.
            </p>
          </div>
          {relevantOperations.length ? (
            <div className="divide-y divide-[var(--line-soft)]">
              {relevantOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-[11px] text-[var(--ink)]">
                      {operation.name}
                    </strong>
                    <span className="mt-1 block text-[10px] text-[var(--muted)]">
                      {operation.requestedBy} · {dateFormat(operation.queuedAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-[var(--ink)]">
                      {statusLabel(operation.status)}
                    </span>
                    {operation.result && (
                      <span className="mt-1 block max-w-[320px] text-[10px] text-[var(--muted)]">
                        {operation.result}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 px-5 py-5 text-[11px] text-[var(--muted)]">
              Nenhuma operação registrada.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
