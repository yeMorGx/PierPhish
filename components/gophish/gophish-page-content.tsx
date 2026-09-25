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

type GophishGroup = {
  id: number;
  name: string;
  numTargets: number;
  modifiedDate: string;
};
type GophishTemplate = { id: number; name: string; modifiedDate: string };
type GophishPage = {
  id: number;
  name: string;
  captureCredentials: boolean | null;
  capturePasswords: boolean | null;
  modifiedDate: string;
};
type GophishSendingProfile = {
  id: number;
  name: string;
  modifiedDate: string;
};
type Snapshot = {
  updatedAt: string;
  campaigns: GophishCampaign[];
  groups: GophishGroup[];
  templates: GophishTemplate[];
  pages: GophishPage[];
  sendingProfiles: GophishSendingProfile[];
};
type Connector = {
  id: string;
  name: string;
  lastSeen: string | null;
  createdAt: string;
  online: boolean;
  snapshot: Snapshot;
};
type CampaignPreview = {
  previewId: string;
  expiresAt: string;
  campaignName: string;
  groups: Array<{ id: number; name: string; numTargets: number }>;
  recipientCount: number;
  template: string;
  page: string;
  sendingProfile: string;
  launchAt: string | null;
  sendBy: string | null;
};
type CampaignOperation = {
  id: string;
  campaignName: string;
  requestedBy: string;
  groups: Array<{ id: number; name: string; numTargets: number }>;
  recipientCount: number;
  template: string;
  page: string;
  sendingProfile: string;
  launchAt: string | null;
  sendBy: string | null;
  status: string;
  queuedAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
  campaignId: number | null;
  result: string;
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

function operationStatus(status: string) {
  switch (status) {
    case "queued":
      return "Aguardando conector";
    case "processing":
      return "Executando no computador local";
    case "succeeded":
      return "Criada no GoPhish";
    case "failed":
      return "Bloqueada ou recusada";
    case "uncertain":
      return "Verificação manual necessária";
    case "expired":
      return "Expirada sem envio";
    default:
      return status;
  }
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
  const [campaignName, setCampaignName] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [pageId, setPageId] = useState("");
  const [sendingProfileId, setSendingProfileId] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [launchMode, setLaunchMode] = useState<"now" | "scheduled">("now");
  const [launchAtInput, setLaunchAtInput] = useState("");
  const [sendByInput, setSendByInput] = useState("");
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [confirmingCampaign, setConfirmingCampaign] = useState(false);
  const [operations, setOperations] = useState<CampaignOperation[]>([]);
  const [operationsError, setOperationsError] = useState("");
  const [campaignConnectorId, setCampaignConnectorId] = useState("");

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

  const loadOperations = useCallback(async () => {
    if (!session?.access_token || !isSupabaseConfigured) return;
    try {
      const response = await fetch(
        `/api/gophish/campaigns?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(errorMessage(body, "Falha ao carregar o histórico."));
      setOperations(body.operations ?? []);
      setOperationsError("");
    } catch (cause) {
      setOperationsError(
        cause instanceof Error
          ? cause.message
          : "Falha ao carregar o histórico.",
      );
    }
  }, [activeWorkspaceId, session?.access_token]);

  useEffect(() => {
    void loadConnectors();
    void loadOperations();
    const timer = window.setInterval(() => {
      void loadConnectors(true);
      void loadOperations();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadConnectors, loadOperations]);

  const onlineConnectors = connectors.filter((connector) => connector.online);
  const connected =
    onlineConnectors.find(
      (connector) => connector.id === campaignConnectorId,
    ) ??
    onlineConnectors[0] ??
    null;
  const campaignConnector = connected;
  const snapshot =
    campaignConnector?.snapshot ?? connectors[0]?.snapshot ?? null;
  const campaigns = snapshot?.campaigns ?? [];
  const groups = snapshot?.groups ?? [];
  const templates = campaignConnector?.snapshot.templates ?? [];
  const pages = campaignConnector?.snapshot.pages ?? [];
  const sendingProfiles = campaignConnector?.snapshot.sendingProfiles ?? [];
  const estimatedRecipientCount = groups
    .filter((group) => selectedGroupIds.includes(group.id))
    .reduce((total, group) => total + group.numTargets, 0);
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

  async function createCampaignPreview() {
    if (!session?.access_token || !campaignConnector) {
      setError("Conecte um GoPhish local ativo antes de preparar a campanha.");
      return;
    }
    setCreatingPreview(true);
    setError("");
    setPreview(null);
    try {
      const response = await fetch("/api/gophish/campaigns/preview", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          connectorId: campaignConnector.id,
          campaignName,
          groupIds: selectedGroupIds,
          templateId: Number(templateId),
          pageId: Number(pageId),
          sendingProfileId: Number(sendingProfileId),
          url: destinationUrl,
          launchAt:
            launchMode === "scheduled" && launchAtInput
              ? new Date(launchAtInput).toISOString()
              : null,
          sendBy:
            launchMode === "scheduled" && sendByInput
              ? new Date(sendByInput).toISOString()
              : null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Não foi possível preparar a prévia."),
        );
      setPreview(body as CampaignPreview);
      setConfirmationText("");
      setConfirmationChecked(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível preparar a prévia.",
      );
    } finally {
      setCreatingPreview(false);
    }
  }

  async function confirmCampaign() {
    if (!session?.access_token || !preview) return;
    setConfirmingCampaign(true);
    setError("");
    try {
      const response = await fetch("/api/gophish/campaigns/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          previewId: preview.previewId,
          confirmation: confirmationText,
          accepted: confirmationChecked,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Não foi possível confirmar a campanha."),
        );
      setPreview(null);
      setConfirmationText("");
      setConfirmationChecked(false);
      toast.success("Confirmação registrada", {
        description:
          "O conector local buscará a ordem e atualizará o histórico.",
      });
      await loadOperations();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar a campanha.",
      );
    } finally {
      setConfirmingCampaign(false);
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
                CONECTOR WINDOWS · CAMPANHAS COM CONFIRMAÇÃO
              </span>
              <h2 className="mt-2 mb-0 text-[22px] font-semibold tracking-[-0.05em]">
                Campanhas e grupos do GoPhish
              </h2>
              <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--muted)]">
                O conector acessa o GoPhish apenas em 127.0.0.1:3333 e envia
                atualizações e ordens confirmadas ao Piersec por HTTPS. A chave
                GoPhish e os dados do perfil SMTP continuam no computador local.
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

        <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
          <div className="max-w-[740px]">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-[var(--muted)] uppercase">
              NOVA CAMPANHA
            </span>
            <h3 className="mt-2 mb-0 text-[18px] font-semibold tracking-[-0.04em]">
              Preparar envio pelo GoPhish
            </h3>
            <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--muted)]">
              Escolha os ativos locais. A primeira etapa só monta uma prévia; o
              conector envia a campanha ao GoPhish depois da revisão e da
              confirmação pelo nome exato.
            </p>
          </div>

          {!campaignConnector && (
            <p className="mt-4 mb-0 rounded-[12px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] text-[var(--muted)]">
              Conecte o computador Windows e aguarde a sincronização para
              carregar os grupos, modelos, páginas e perfis locais.
            </p>
          )}

          {onlineConnectors.length > 1 && (
            <label className="mt-4 grid max-w-[420px] gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              COMPUTADOR GOPhish
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={campaignConnector?.id ?? ""}
                onChange={(event) => setCampaignConnectorId(event.target.value)}
              >
                {onlineConnectors.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              NOME DA CAMPANHA
              <input
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={campaignName}
                maxLength={120}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Ex.: Treinamento de segurança — setembro"
              />
            </label>
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              MODELO DE E-MAIL
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Selecione um modelo</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              PÁGINA DE DESTINO
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={pageId}
                onChange={(event) => setPageId(event.target.value)}
              >
                <option value="">
                  Selecione uma página sem captura de credenciais
                </option>
                {pages.map((page) => {
                  const unsafe =
                    page.captureCredentials !== false ||
                    page.capturePasswords !== false;
                  return (
                    <option key={page.id} value={page.id} disabled={unsafe}>
                      {page.name}
                      {unsafe ? " · bloqueada: captura dados de acesso" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              PERFIL DE ENVIO
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={sendingProfileId}
                onChange={(event) => setSendingProfileId(event.target.value)}
              >
                <option value="">Selecione um perfil</option>
                {sendingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <span className="text-[9px] font-normal">
                O Piersec exibe o nome. Credenciais e servidor SMTP não saem do
                Windows.
              </span>
            </label>
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)] md:col-span-2">
              URL DE DESTINO HTTPS
              <input
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                type="url"
                inputMode="url"
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://treinamento.sua-empresa.example"
              />
              <span className="text-[9px] font-normal">
                Use apenas ambientes de treinamento autorizados. A página
                escolhida não pode capturar credenciais ou senhas.
              </span>
            </label>
          </div>

          <fieldset className="mt-5 rounded-[14px] border border-[var(--line-soft)] p-4">
            <legend className="px-1 text-[10px] font-bold text-[var(--muted)]">
              GRUPOS · {numberFormat(estimatedRecipientCount)} destinatário(s)
              estimado(s)
            </legend>
            {groups.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                  <label
                    className="flex min-w-0 items-center gap-2 rounded-[10px] bg-[var(--surface-soft)] px-3 py-2.5 text-[11px] text-[var(--ink)]"
                    key={group.id}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={(event) =>
                        setSelectedGroupIds((current) =>
                          event.target.checked
                            ? [...current, group.id]
                            : current.filter((id) => id !== group.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] tabular-nums">
                      {numberFormat(group.numTargets)}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[11px] text-[var(--muted)]">
                Nenhum grupo sincronizado ainda.
              </p>
            )}
          </fieldset>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(200px,0.55fr)_1fr]">
            <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              QUANDO ENVIAR
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={launchMode}
                onChange={(event) =>
                  setLaunchMode(event.target.value as "now" | "scheduled")
                }
              >
                <option value="now">
                  Assim que o conector buscar (até 30 s)
                </option>
                <option value="scheduled">Agendar data e hora</option>
              </select>
            </label>
            {launchMode === "scheduled" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
                  INÍCIO
                  <input
                    className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                    type="datetime-local"
                    value={launchAtInput}
                    onChange={(event) => setLaunchAtInput(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-[10px] font-bold text-[var(--muted)]">
                  ENVIAR ATÉ · OPCIONAL
                  <input
                    className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                    type="datetime-local"
                    value={sendByInput}
                    onChange={(event) => setSendByInput(event.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          <button
            className="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--ink)] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => void createCampaignPreview()}
            disabled={
              creatingPreview ||
              !campaignConnector ||
              !campaignName.trim() ||
              !selectedGroupIds.length ||
              !templateId ||
              !pageId ||
              !sendingProfileId ||
              !destinationUrl.trim() ||
              (launchMode === "scheduled" && !launchAtInput)
            }
          >
            {creatingPreview ? "Montando prévia…" : "Revisar campanha"}
          </button>
        </section>

        {preview && (
          <section className="surface-card rounded-[22px] border border-[#e7d5a4] bg-[#fffcf3] p-6 max-[720px]:p-4">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#856c30] uppercase">
              REVISÃO OBRIGATÓRIA · EXPIRA {dateFormat(preview.expiresAt)}
            </span>
            <h3 className="mt-2 mb-0 text-[17px] font-semibold tracking-[-0.04em] text-[var(--ink)]">
              {preview.campaignName}
            </h3>
            <div className="mt-4 grid gap-2 text-[11px] text-[var(--ink)] sm:grid-cols-2">
              <p className="m-0">
                <strong>Grupos:</strong>{" "}
                {preview.groups
                  .map(
                    (group) =>
                      `${group.name} (${numberFormat(group.numTargets)})`,
                  )
                  .join(", ")}
              </p>
              <p className="m-0">
                <strong>Total estimado:</strong>{" "}
                {numberFormat(preview.recipientCount)} destinatário(s)
              </p>
              <p className="m-0">
                <strong>Modelo:</strong> {preview.template}
              </p>
              <p className="m-0">
                <strong>Página:</strong> {preview.page} · sem captura de
                credenciais
              </p>
              <p className="m-0">
                <strong>Perfil de envio:</strong> {preview.sendingProfile}
              </p>
              <p className="m-0">
                <strong>Início:</strong>{" "}
                {preview.launchAt
                  ? dateFormat(preview.launchAt)
                  : "Assim que o conector buscar a ordem (até 30 s)"}
              </p>
              {preview.sendBy && (
                <p className="m-0">
                  <strong>Prazo de envio:</strong> {dateFormat(preview.sendBy)}
                </p>
              )}
            </div>
            <div className="mt-4 rounded-[11px] border border-[#ead8a8] bg-white/70 p-3 text-[11px] leading-relaxed text-[#6f5b2c]">
              Confirmar coloca uma ordem de uso único na fila do conector. Após
              recebê-la, o GoPhish pode começar a enviar imediatamente ou no
              horário agendado. Confira o grupo e o total antes de continuar.
            </div>
            <label className="mt-4 grid max-w-[520px] gap-1.5 text-[10px] font-bold text-[var(--muted)]">
              DIGITE O NOME EXATO DA CAMPANHA PARA CONFIRMAR
              <input
                className="h-10 rounded-[10px] border border-[var(--line)] bg-white px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[#aab8bd]"
                value={confirmationText}
                maxLength={120}
                onChange={(event) => setConfirmationText(event.target.value)}
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--ink)]">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={confirmationChecked}
                onChange={(event) =>
                  setConfirmationChecked(event.target.checked)
                }
              />
              Confirmo que tenho autorização para executar esta campanha neste
              ambiente de treinamento.
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#7b3e2d] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void confirmCampaign()}
                disabled={
                  confirmingCampaign ||
                  !confirmationChecked ||
                  confirmationText !== preview.campaignName
                }
              >
                {confirmingCampaign
                  ? "Registrando confirmação…"
                  : "Confirmar campanha"}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--muted)]"
                type="button"
                onClick={() => setPreview(null)}
              >
                Cancelar prévia
              </button>
            </div>
          </section>
        )}

        <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
            <div>
              <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                Histórico de envios GoPhish
              </h3>
              <p className="mt-1 mb-0 text-[11px] text-[var(--muted)]">
                Solicitante, grupos, estimativa e resultado de cada ordem
                confirmada.
              </p>
            </div>
            <button
              className="rounded-[8px] border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)]"
              type="button"
              onClick={() => void loadOperations()}
            >
              Atualizar
            </button>
          </div>
          {operationsError ? (
            <p className="m-0 px-5 py-5 text-[11px] text-[var(--muted)]">
              {operationsError}
            </p>
          ) : operations.length ? (
            <div className="divide-y divide-[var(--line-soft)]">
              {operations.map((operation) => (
                <article
                  className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto]"
                  key={operation.id}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-[11px] text-[var(--ink)]">
                      {operation.campaignName}
                    </strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-[var(--muted)]">
                      {operation.groups
                        .map(
                          (group) =>
                            `${group.name} (${numberFormat(group.numTargets)})`,
                        )
                        .join(", ")}{" "}
                      · {numberFormat(operation.recipientCount)} destinatário(s)
                      · {operation.template} · {operation.page}
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--muted)]">
                      Solicitante: {operation.requestedBy} · confirmada{" "}
                      {dateFormat(operation.queuedAt)} · início{" "}
                      {operation.launchAt
                        ? dateFormat(operation.launchAt)
                        : "imediato"}
                      {operation.sendBy
                        ? ` · prazo ${dateFormat(operation.sendBy)}`
                        : ""}
                      {operation.campaignId
                        ? ` · GoPhish #${operation.campaignId}`
                        : ""}
                    </span>
                    {operation.result && (
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">
                        {operation.result}
                      </span>
                    )}
                  </div>
                  <span className="h-fit rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)]">
                    {operationStatus(operation.status)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="m-0 px-5 py-6 text-center text-[11px] text-[var(--muted)]">
              Nenhuma campanha confirmada pelo Piersec.
            </p>
          )}
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
