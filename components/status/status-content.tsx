"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Campaign } from "@/components/dashboard/types";
import { demoCampaigns } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Icon } from "@/components/ui/icon";

type StatusTone = "healthy" | "pending" | "attention" | "neutral";

type StatusTotals = {
  campaigns: number;
  people: number;
  delivered: number;
  opened: number;
  clicked: number;
  reported: number;
};

function totalsFromCampaigns(campaigns: Campaign[]): StatusTotals {
  return campaigns.reduce(
    (current, campaign) => ({
      campaigns: current.campaigns + 1,
      people: current.people + Number(campaign.stats?.total ?? 0),
      delivered: current.delivered + Number(campaign.stats?.delivered ?? 0),
      opened: current.opened + Number(campaign.stats?.opened ?? 0),
      clicked: current.clicked + Number(campaign.stats?.clicked ?? 0),
      reported: current.reported + Number(campaign.stats?.email_reported ?? 0),
    }),
    {
      campaigns: 0,
      people: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      reported: 0,
    },
  );
}

function latestSyncFromCampaigns(campaigns: Campaign[]) {
  return campaigns.reduce<string | null>((latest, campaign) => {
    const current = campaign.synced_at ?? campaign.launch_date;
    if (!current) return latest;
    if (!latest || Date.parse(current) > Date.parse(latest)) return current;
    return latest;
  }, null);
}

function StatusMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="status-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatusCheck({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
}) {
  return (
    <div className="status-check-row">
      <span className={`status-check-mark is-${tone}`}>
        <Icon name={tone === "pending" ? "refresh" : "check"} size={15} />
      </span>
      <div className="min-w-0">
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <span className={`status-check-value is-${tone}`}>{value}</span>
    </div>
  );
}

export function StatusContent() {
  const { user } = useAuth();
  const client = supabase;
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await client
      .from("beephish_campaigns")
      .select("id,name,status,launch_date,synced_at,stats")
      .order("synced_at", { ascending: false });

    if (queryError) {
      setError("Não foi possível validar os dados agora.");
      setLoading(false);
      return;
    }

    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadStatus();
    // O cliente e a configuração são constantes durante a sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => totalsFromCampaigns(campaigns), [campaigns]);
  const latestSync = useMemo(
    () => formatDateTime(latestSyncFromCampaigns(campaigns)),
    [campaigns],
  );
  const isDemo = !isSupabaseConfigured;
  const stateTone: StatusTone = loading
    ? "pending"
    : error
      ? "attention"
      : isDemo
        ? "neutral"
        : "healthy";
  const stateLabel = loading
    ? "Verificando conexão"
    : error
      ? "Atenção necessária"
      : isDemo
        ? "Modo demonstração"
        : "Conexão ativa";
  const deliveredRate = totals.people
    ? Math.round((totals.delivered / totals.people) * 100)
    : 0;
  const openedRate = totals.people
    ? Math.round((totals.opened / totals.people) * 100)
    : 0;

  return (
    <DashboardShell activeSection="settings" title="Status do ambiente">
      <div className="status-page grid gap-[var(--cards-gap)] pb-8">
        <section className="status-hero-card surface-card">
          <div className="status-hero-copy">
            <p className="status-eyebrow">STATUS DO AMBIENTE</p>
            <h2>Uma leitura clara da operação.</h2>
            <p>
              Acompanhe a conexão com o BeePhish, a última sincronização e a
              disponibilidade dos dados consolidados em um único lugar.
            </p>
          </div>
          <div className={`status-state-badge is-${stateTone}`}>
            <span className="status-state-dot" />
            <span>
              <strong>{stateLabel}</strong>
              <small>
                {loading
                  ? "Consultando a base de campanhas"
                  : error
                    ? "Revise a conexão e tente novamente"
                    : isDemo
                      ? "Dados locais para visualização"
                      : "Conta autenticada e dados disponíveis"}
              </small>
            </span>
          </div>
        </section>

        {error && (
          <div className="status-error" role="alert">
            <span>
              <strong>Não foi possível concluir a verificação.</strong>
              <small>{error}</small>
            </span>
            <button type="button" onClick={() => void loadStatus()}>
              Tentar novamente
            </button>
          </div>
        )}

        <section className="status-metric-grid" aria-label="Resumo dos dados">
          <StatusMetric
            label="Campanhas"
            value={loading ? "—" : totals.campaigns}
            detail="Campanhas disponíveis"
          />
          <StatusMetric
            label="Pessoas"
            value={loading ? "—" : totals.people}
            detail="Pessoas alcançadas"
          />
          <StatusMetric
            label="Entregues"
            value={loading ? "—" : `${deliveredRate}%`}
            detail={
              loading ? "Aguardando consulta" : `${totals.delivered} entregas`
            }
          />
          <StatusMetric
            label="Aberturas"
            value={loading ? "—" : `${openedRate}%`}
            detail={
              loading ? "Aguardando consulta" : `${totals.opened} aberturas`
            }
          />
        </section>

        <div className="status-content-grid">
          <section className="status-panel surface-card">
            <div className="status-panel-heading">
              <div>
                <p className="status-eyebrow">VERIFICAÇÃO</p>
                <h3>O ambiente está pronto?</h3>
              </div>
              <Icon name="shield" size={21} />
            </div>
            <div className="status-check-list">
              <StatusCheck
                label="Conexão com a conta"
                value={isDemo ? "Demo" : "Ativa"}
                detail={
                  isDemo
                    ? "Nenhuma conta externa configurada"
                    : (user?.email ?? "Sessão autenticada")
                }
                tone={isDemo ? "neutral" : "healthy"}
              />
              <StatusCheck
                label="Leitura das campanhas"
                value={loading ? "Lendo" : error ? "Falhou" : "OK"}
                detail={
                  loading
                    ? "Consultando beephish_campaigns"
                    : error
                      ? "A consulta precisa ser repetida"
                      : `${totals.campaigns} campanhas retornadas`
                }
                tone={loading ? "pending" : error ? "attention" : "healthy"}
              />
              <StatusCheck
                label="Última sincronização"
                value={loading ? "—" : latestSync}
                detail={
                  isDemo
                    ? "Exemplo local da interface"
                    : "Registro mais recente entre as campanhas"
                }
                tone={loading ? "pending" : "healthy"}
              />
              <StatusCheck
                label="Dados para análise"
                value={loading ? "—" : `${totals.clicked + totals.reported}`}
                detail="Cliques e relatos registrados"
                tone={loading ? "pending" : "healthy"}
              />
            </div>
          </section>

          <section className="status-panel status-panel-secondary surface-card">
            <div className="status-panel-heading">
              <div>
                <p className="status-eyebrow">LEITURA RÁPIDA</p>
                <h3>O que está sendo acompanhado</h3>
              </div>
              <Icon name="chart" size={21} />
            </div>
            <div className="status-signal-list">
              <div>
                <span className="status-signal-icon is-blue">
                  <Icon name="grid" size={16} />
                </span>
                <span>
                  <strong>Campanhas consolidadas</strong>
                  <small>Todos os envios disponíveis na conta.</small>
                </span>
                <b>{loading ? "—" : totals.campaigns}</b>
              </div>
              <div>
                <span className="status-signal-icon is-green">
                  <Icon name="users" size={16} />
                </span>
                <span>
                  <strong>Pessoas alcançadas</strong>
                  <small>Base usada para calcular os indicadores.</small>
                </span>
                <b>{loading ? "—" : totals.people}</b>
              </div>
              <div>
                <span className="status-signal-icon is-orange">
                  <Icon name="shield" size={16} />
                </span>
                <span>
                  <strong>Sinais de atenção</strong>
                  <small>Cliques e relatos que pedem investigação.</small>
                </span>
                <b>{loading ? "—" : totals.clicked + totals.reported}</b>
              </div>
            </div>
            <p className="status-panel-note">
              Os indicadores são calculados a partir do conjunto de campanhas,
              sem destacar uma campanha individual.
            </p>
          </section>
        </div>

        <section className="status-footer-card surface-card">
          <div>
            <p className="status-eyebrow">PRÓXIMO PASSO</p>
            <h3>Quer ajustar a aparência do painel?</h3>
            <p>
              Volte para Configurações para personalizar tema, fundo e cards.
            </p>
          </div>
          <div className="status-footer-actions">
            <Link href="/configuracoes">
              Configurações
              <Icon name="arrow" size={15} />
            </Link>
            <Link className="is-secondary" href="/">
              Visão geral
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
