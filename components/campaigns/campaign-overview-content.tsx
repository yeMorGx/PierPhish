"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { CampaignsNavigation } from "@/components/campaigns/campaigns-navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type CampaignStats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  submittedData: number;
  emailReported: number;
  error: number;
};

type Campaign = {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  launchAt: string;
  stats: CampaignStats;
};

type Connector = {
  id: string;
  name: string;
  online: boolean;
  snapshot?: {
    updatedAt: string;
    campaigns: Campaign[];
  };
};

const activityChartConfig = {
  opened: { label: "Abertos", color: "var(--text-muted)" },
  clicked: { label: "Cliques", color: "var(--ink)" },
} satisfies ChartConfig;

const rateChartConfig = {
  openRate: { label: "Taxa de abertura", color: "var(--text-muted)" },
  clickRate: { label: "Taxa de cliques", color: "var(--ink)" },
} satisfies ChartConfig;

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

function campaignDate(campaign: Campaign) {
  return campaign.launchAt || campaign.createdAt;
}

function chartName(value: string) {
  return value.length > 20 ? value.slice(0, 18) + "…" : value;
}

function errorMessage(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

export function CampaignOverviewContent() {
  const { session } = useAuth();
  const workspaceId = useActiveWorkspaceId();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(
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
          "/api/campaigns/connection?workspaceId=" +
            encodeURIComponent(workspaceId),
          {
            headers: { Authorization: "Bearer " + session.access_token },
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            errorMessage(body, "Não foi possível carregar as campanhas."),
          );
        setConnectors(Array.isArray(body.connectors) ? body.connectors : []);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar as campanhas.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.access_token, workspaceId],
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const connector =
    connectors.find((item) => item.online) ?? connectors[0] ?? null;
  const campaigns = connector?.snapshot?.campaigns ?? [];
  const updatedAt = connector?.snapshot?.updatedAt ?? "";
  const totals = useMemo(
    () =>
      campaigns.reduce(
        (summary, campaign) => ({
          recipients: summary.recipients + campaign.stats.total,
          sent: summary.sent + campaign.stats.sent,
          opened: summary.opened + campaign.stats.opened,
          clicked: summary.clicked + campaign.stats.clicked,
          errors: summary.errors + campaign.stats.error,
        }),
        { recipients: 0, sent: 0, opened: 0, clicked: 0, errors: 0 },
      ),
    [campaigns],
  );
  const chartData = useMemo(
    () =>
      [...campaigns]
        .sort(
          (left, right) =>
            new Date(campaignDate(left)).getTime() -
            new Date(campaignDate(right)).getTime(),
        )
        .slice(-8)
        .map((campaign) => ({
          id: campaign.id,
          name: chartName(campaign.name),
          opened: campaign.stats.opened,
          clicked: campaign.stats.clicked,
          openRate:
            campaign.stats.sent > 0
              ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100)
              : 0,
          clickRate:
            campaign.stats.sent > 0
              ? Math.round((campaign.stats.clicked / campaign.stats.sent) * 100)
              : 0,
        })),
    [campaigns],
  );

  return (
    <DashboardShell
      activeSection="campaigns"
      title="Campanhas/Visão geral"
      headerAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={refreshing ? "size-3.5 animate-spin" : "size-3.5"}
            />
            Atualizar
          </button>
          <Link
            href="/campanhas/nova"
            className="campaign-primary-action inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-bold transition-colors"
          >
            Nova campanha
          </Link>
        </div>
      }
    >
      <div className="grid gap-4">
        <CampaignsNavigation current="overview" />
        {error && (
          <p
            role="alert"
            className="m-0 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[11px] text-[var(--danger)]"
          >
            {error}
          </p>
        )}

        <section className="surface-card overflow-hidden rounded-[18px] border border-[var(--card-border)]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                Resultados das campanhas
              </h2>
              <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                {numberFormat(campaigns.length)} campanha(s) · dados de{" "}
                {dateFormat(updatedAt)}
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {connector?.online ? "Ambiente conectado" : "Sem conexão ativa"}
            </span>
          </div>
          <dl className="m-0 grid grid-cols-2 divide-x divide-[var(--line-soft)] md:grid-cols-5">
            {[
              ["Destinatários", totals.recipients],
              ["Enviados", totals.sent],
              ["Abertos", totals.opened],
              ["Cliques", totals.clicked],
              ["Falhas", totals.errors],
            ].map(([label, value]) => (
              <div className="min-w-0 px-5 py-4" key={label}>
                <dt className="text-[10px] text-[var(--text-muted)]">
                  {label}
                </dt>
                <dd className="mt-1 mb-0 text-[20px] font-semibold tracking-[-0.03em] text-[var(--ink)] tabular-nums">
                  {loading ? "—" : numberFormat(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {loading ? (
          <p className="m-0 rounded-[14px] border border-[var(--line)] px-4 py-6 text-center text-[11px] text-[var(--text-muted)]">
            Carregando dados do ambiente…
          </p>
        ) : !connector ? (
          <section className="surface-card rounded-[18px] border border-[var(--card-border)] px-5 py-8 text-center">
            <h2 className="m-0 text-[14px] font-semibold text-[var(--ink)]">
              Conecte um ambiente de campanhas
            </h2>
            <p className="mx-auto mt-2 mb-0 max-w-[500px] text-[11px] leading-relaxed text-[var(--text-muted)]">
              Depois da conexão, esta página mostra os resultados sincronizados
              do ambiente selecionado.
            </p>
            <Link
              href="/campanhas/conexao"
              className="mt-4 inline-flex text-[11px] font-semibold text-[var(--ink)] underline underline-offset-4"
            >
              Abrir conexão
            </Link>
          </section>
        ) : campaigns.length === 0 ? (
          <section className="surface-card rounded-[18px] border border-[var(--card-border)] px-5 py-8 text-center">
            <h2 className="m-0 text-[14px] font-semibold text-[var(--ink)]">
              Nenhuma campanha para mostrar
            </h2>
            <p className="mx-auto mt-2 mb-0 max-w-[500px] text-[11px] leading-relaxed text-[var(--text-muted)]">
              Quando uma campanha for criada no PierSec, os indicadores e
              gráficos aparecerão aqui.
            </p>
            <Link
              href="/campanhas"
              className="mt-4 inline-flex text-[11px] font-semibold text-[var(--ink)] underline underline-offset-4"
            >
              Ver lista de campanhas
            </Link>
          </section>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="surface-card min-w-0 rounded-[18px] border border-[var(--card-border)] p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[14px] font-semibold text-[var(--ink)]">
                      Aberturas e cliques por campanha
                    </h2>
                    <p className="mt-1 mb-0 text-[10px] text-[var(--text-muted)]">
                      Comparação das 8 campanhas mais recentes
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {numberFormat(totals.clicked)} clique(s) no total
                  </span>
                </div>
                <ChartContainer
                  config={activityChartConfig}
                  className="mt-4 h-[300px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => numberFormat(Number(value))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="opened"
                      fill="var(--color-opened)"
                      radius={3}
                      barSize={12}
                    />
                    <Bar
                      dataKey="clicked"
                      fill="var(--color-clicked)"
                      radius={3}
                      barSize={12}
                    />
                  </BarChart>
                </ChartContainer>
              </section>

              <section className="surface-card min-w-0 rounded-[18px] border border-[var(--card-border)] p-5">
                <div>
                  <h2 className="m-0 text-[14px] font-semibold text-[var(--ink)]">
                    Taxa de abertura e de cliques
                  </h2>
                  <p className="mt-1 mb-0 text-[10px] text-[var(--text-muted)]">
                    Percentual sobre e-mails aceitos pelo servidor de envio
                  </p>
                </div>
                <ChartContainer
                  config={rateChartConfig}
                  className="mt-4 h-[300px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => String(value) + "%"}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => String(value) + "%"}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="openRate"
                      fill="var(--color-openRate)"
                      radius={3}
                      barSize={12}
                    />
                    <Bar
                      dataKey="clickRate"
                      fill="var(--color-clickRate)"
                      radius={3}
                      barSize={12}
                    />
                  </BarChart>
                </ChartContainer>
                <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  A taxa de cliques é cliques ÷ e-mails aceitos. A sincronização
                  ocorre em intervalos de até 30 segundos.
                </p>
              </section>
            </div>

            <section className="surface-card rounded-[18px] border border-[var(--card-border)] px-5 py-4">
              <h2 className="m-0 text-[12px] font-semibold text-[var(--ink)]">
                Como os cliques são contabilizados
              </h2>
              <p className="mt-1 mb-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
                O modelo precisa usar <code>{'href="{{.URL}}"'}</code> e o
                domínio público de rastreamento precisa encaminhar o clique ao
                ambiente. Campanhas anteriores com link direto não passam a
                registrar cliques retroativamente.
              </p>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
