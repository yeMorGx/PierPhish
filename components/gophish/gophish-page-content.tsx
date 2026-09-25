"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";

type CampaignStats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  submittedData: number;
  emailReported: number;
  error: number;
};

type GophishCampaign = {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  launchAt: string;
  completedAt: string;
  template: string;
  page: string;
  groups: string[];
  stats: CampaignStats;
};

type GophishGroup = { id: number; name: string; numTargets: number };
type Snapshot = {
  updatedAt: string;
  campaigns: GophishCampaign[];
  groups: GophishGroup[];
};
type Connector = {
  id: string;
  name: string;
  lastSeen: string | null;
  createdAt: string;
  online: boolean;
  snapshot: Snapshot;
};

function numberFormat(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function dateFormat(value: string | null | undefined) {
  if (!value || value.startsWith("0001-01-01")) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(body: unknown, fallback: string) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="surface-card rounded-[20px] border border-[var(--card-border)] p-5">
      <span className="text-[10px] font-extrabold tracking-[0.14em] text-[var(--muted)] uppercase">
        {label}
      </span>
      <strong className="mt-3 block text-[27px] leading-none tracking-[-0.05em] text-[var(--ink)]">
        {numberFormat(value)}
      </strong>
      <span className="mt-2 block text-[11px] text-[var(--muted)]">
        {detail}
      </span>
    </article>
  );
}

export function GophishPageContent() {
  const { session } = useAuth();
  const activeWorkspaceId = useActiveWorkspaceId();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingPairing, setCreatingPairing] = useState(false);
  const [connectorName, setConnectorName] = useState("GoPhish local");
  const [pairing, setPairing] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");

  const loadConnectors = useCallback(
    async (quiet = false) => {
      if (!session?.access_token || !isSupabaseConfigured) {
        setConnectors([]);
        setLoading(false);
        return;
      }
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(
          `/api/gophish?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(errorMessage(body, "Falha ao carregar o conector."));
        setConnectors(body.connectors ?? []);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar o conector.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeWorkspaceId, session?.access_token],
  );

  useEffect(() => {
    void loadConnectors();
    const timer = window.setInterval(() => void loadConnectors(true), 30_000);
    return () => window.clearInterval(timer);
  }, [loadConnectors]);

  const connected = connectors.find((connector) => connector.online) ?? null;
  const snapshot = connected?.snapshot ?? connectors[0]?.snapshot ?? null;
  const campaigns = snapshot?.campaigns ?? [];
  const groups = snapshot?.groups ?? [];
  const metrics = useMemo(
    () =>
      campaigns.reduce(
        (total, campaign) => ({
          recipients: total.recipients + campaign.stats.total,
          clicked: total.clicked + campaign.stats.clicked,
          reported: total.reported + campaign.stats.emailReported,
        }),
        { recipients: 0, clicked: 0, reported: 0 },
      ),
    [campaigns],
  );

  async function createPairing() {
    if (!session?.access_token) {
      setError("Entre novamente para parear o conector.");
      return;
    }
    setCreatingPairing(true);
    setError("");
    setPairing(null);
    try {
      const response = await fetch("/api/gophish/pairings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          connectorName: connectorName.trim() || "GoPhish local",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Falha ao criar o código de pareamento."),
        );
      setPairing({ code: body.pairingCode, expiresAt: body.expiresAt });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao criar o código de pareamento.",
      );
    } finally {
      setCreatingPairing(false);
    }
  }

  async function copyPairingCode() {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar o código neste navegador.");
    }
  }

  const statusLabel = loading
    ? "Verificando"
    : connected
      ? "Conectado"
      : connectors.length
        ? "Sem sinal"
        : "Não pareado";

  return (
    <DashboardShell activeSection="gophish" title="GoPhish local">
      <div className="grid gap-4">
        <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-[700px]">
              <span className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--muted)] uppercase">
                CONECTOR WINDOWS · SOMENTE LEITURA
              </span>
              <h2 className="mt-2 mb-0 text-[22px] font-semibold tracking-[-0.05em]">
                Campanhas e grupos do GoPhish
              </h2>
              <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--muted)]">
                O conector acessa o GoPhish apenas em 127.0.0.1:3333 e envia
                atualizações ao Piersec por HTTPS. Nenhum comando de criação ou
                lançamento está disponível.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[11px] font-bold ${connected ? "bg-[#e8f4ed] text-[#28744c]" : "bg-[var(--surface-soft)] text-[var(--muted)]"}`}
              >
                <span
                  className={`size-2 rounded-full ${connected ? "bg-[#3a9a68]" : "bg-[#a4adb2]"}`}
                />
                {statusLabel}
              </span>
              <button
                className="grid size-9 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
                type="button"
                aria-label="Atualizar estado do conector"
                onClick={() => void loadConnectors(true)}
                disabled={refreshing || loading}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>
          </div>
          {connected && (
            <p className="mt-4 mb-0 text-[11px] text-[var(--muted)]">
              {connected.name} · última atualização{" "}
              {dateFormat(snapshot?.updatedAt)}
            </p>
          )}
        </section>

        <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
            <div>
              <span className="text-[10px] font-extrabold tracking-[0.14em] text-[var(--muted)] uppercase">
                PAREAR UM COMPUTADOR WINDOWS
              </span>
              <h3 className="mt-2 mb-0 text-[17px] font-semibold tracking-[-0.04em]">
                Conector local
              </h3>
              <ol className="mt-4 grid gap-2 pl-5 text-[12px] leading-relaxed text-[var(--muted)] marker:font-bold marker:text-[var(--ink)]">
                <li>Gere um código de pareamento válido por 10 minutos.</li>
                <li>
                  Execute{" "}
                  <code className="rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[11px]">
                    scripts/gophish-connector.ps1
                  </code>{" "}
                  no computador que roda o GoPhish.
                </li>
                <li>
                  Informe o código, o certificado admin.crt e a chave API no
                  terminal local.
                </li>
              </ol>
              <p className="mt-4 mb-0 text-[11px] leading-relaxed text-[var(--muted)]">
                A chave API e o token do conector ficam cifrados com DPAPI no
                perfil Windows atual. Use PowerShell 7. O certificado admin.crt
                é fixado pelo conector para validar o HTTPS local.
              </p>
            </div>
            <div className="rounded-[17px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4">
              <label className="grid gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[var(--muted)] uppercase">
                Nome deste computador
                <input
                  className="h-10 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal tracking-normal text-[var(--ink)] normal-case outline-none focus:border-[#aab8bd]"
                  value={connectorName}
                  maxLength={80}
                  onChange={(event) => setConnectorName(event.target.value)}
                />
              </label>
              <button
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--ink)] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void createPairing()}
                disabled={creatingPairing || !isSupabaseConfigured}
              >
                {creatingPairing
                  ? "Gerando código…"
                  : "Gerar código de pareamento"}
                <Icon name="arrow" size={14} />
              </button>
              {pairing && (
                <div className="mt-3 rounded-[12px] border border-[#d9e8dc] bg-[#f4faf5] p-3">
                  <span className="block text-[9px] font-extrabold tracking-[0.13em] text-[#52765d] uppercase">
                    CÓDIGO DE USO ÚNICO
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-hidden text-[12px] text-ellipsis text-[#304938]">
                      {pairing.code}
                    </code>
                    <button
                      className="rounded-[8px] border border-[#cadbce] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#45664f]"
                      type="button"
                      onClick={() => void copyPairingCode()}
                    >
                      Copiar
                    </button>
                  </div>
                  <span className="mt-2 block text-[10px] text-[#698172]">
                    Expira às {dateFormat(pairing.expiresAt)}. O código não será
                    exibido novamente.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p
            className="m-0 rounded-[14px] border border-[#efc6bc] bg-[#fff5f2] px-4 py-3 text-[12px] text-[#984f3f]"
            role="alert"
          >
            {error}
          </p>
        )}

        {!isSupabaseConfigured && (
          <p className="m-0 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[12px] text-[var(--muted)]">
            Configure o Supabase para parear um conector. Dados de demonstração
            não criam conexões reais.
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="CAMPANHAS"
            value={campaigns.length}
            detail="visíveis na instância local"
          />
          <MetricCard
            label="GRUPOS"
            value={groups.length}
            detail="com totais agregados de pessoas"
          />
          <MetricCard
            label="DESTINATÁRIOS"
            value={metrics.recipients}
            detail="somados nos resultados consultados"
          />
          <MetricCard
            label="CLIQUES · REPORTES"
            value={metrics.clicked + metrics.reported}
            detail={`${numberFormat(metrics.clicked)} cliques · ${numberFormat(metrics.reported)} reportes`}
          />
        </section>

        <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
            <div>
              <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                Campanhas e resultados
              </h3>
              <p className="mt-1 mb-0 text-[11px] text-[var(--muted)]">
                Resumo agregado da API oficial do GoPhish.
              </p>
            </div>
            <span className="text-[10px] text-[var(--muted)]">
              {numberFormat(campaigns.length)} campanha(s)
            </span>
          </div>
          {campaigns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-[11px]">
                <thead className="bg-[var(--surface-soft)] text-[9px] font-extrabold tracking-[0.1em] text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-5 py-3">Campanha</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Destinatários</th>
                    <th className="px-4 py-3 text-right">Abertos</th>
                    <th className="px-4 py-3 text-right">Cliques</th>
                    <th className="px-4 py-3 text-right">Dados</th>
                    <th className="px-5 py-3">Envio</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      className="border-t border-[var(--line-soft)]"
                      key={campaign.id}
                    >
                      <td className="px-5 py-3.5">
                        <strong className="block text-[11px] text-[var(--ink)]">
                          {campaign.name}
                        </strong>
                        <span className="mt-1 block text-[10px] text-[var(--muted)]">
                          {[campaign.template, campaign.page]
                            .filter(Boolean)
                            .join(" · ") || "Modelo e página não informados"}
                        </span>
                        {campaign.groups.length > 0 && (
                          <span className="mt-1 block text-[10px] text-[var(--muted)]">
                            Grupos: {campaign.groups.join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--muted)]">
                        {campaign.status || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {numberFormat(campaign.stats.total)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {numberFormat(campaign.stats.opened)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {numberFormat(campaign.stats.clicked)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {numberFormat(campaign.stats.submittedData)}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--muted)]">
                        {dateFormat(campaign.launchAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <strong className="block text-[12px] text-[var(--ink)]">
                {loading
                  ? "Carregando campanhas…"
                  : "Nenhuma campanha sincronizada"}
              </strong>
              <span className="mt-1 block text-[11px] text-[var(--muted)]">
                {connectors.length
                  ? "Verifique se o conector local está em execução."
                  : "Pareie o computador Windows para começar a leitura."}
              </span>
            </div>
          )}
        </section>

        <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
          <div className="flex items-end justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
            <div>
              <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                Grupos locais
              </h3>
              <p className="mt-1 mb-0 text-[11px] text-[var(--muted)]">
                Somente nome e quantidade de destinatários.
              </p>
            </div>
            <span className="text-[10px] text-[var(--muted)]">
              {numberFormat(groups.length)} grupo(s)
            </span>
          </div>
          {groups.length ? (
            <div className="grid gap-px bg-[var(--line-soft)] sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <div
                  className="flex items-center justify-between gap-3 bg-[var(--surface)] px-5 py-4"
                  key={group.id}
                >
                  <div className="min-w-0">
                    <strong className="block overflow-hidden text-[11px] text-ellipsis whitespace-nowrap">
                      {group.name}
                    </strong>
                    <span className="mt-1 block text-[10px] text-[var(--muted)]">
                      Grupo GoPhish #{group.id}
                    </span>
                  </div>
                  <span className="flex-none rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">
                    {numberFormat(group.numTargets)} pessoas
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 px-5 py-7 text-center text-[11px] text-[var(--muted)]">
              {loading
                ? "Carregando grupos…"
                : "Os grupos serão exibidos depois da primeira sincronização."}
            </p>
          )}
        </section>

        {snapshot && (
          <p className="m-0 px-1 text-[10px] leading-relaxed text-[var(--muted)]">
            A nuvem recebe apenas nomes de campanhas, grupos e modelos, datas e
            estatísticas agregadas. A lista de pessoas, e-mails, IPs, eventos
            brutos e dados submetidos nunca é enviada pelo conector.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
