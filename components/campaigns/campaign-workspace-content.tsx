"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import { SlideToConfirm } from "@/components/lightswind/slide-to-confirm";
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CampaignPagination } from "@/components/campaigns/campaign-pagination";
import { CampaignSectionHeader } from "@/components/campaigns/campaign-section-header";
import {
  CampaignsNavigation,
  type CampaignPageView,
} from "@/components/campaigns/campaigns-navigation";
import {
  createSecureReturnKey,
  decryptSecureReturn,
  type EncryptedReturn,
} from "@/lib/campaigns/secure-return";

type CampaignStats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  submittedData: number;
  emailReported: number;
  error: number;
};

type DeliveryIssueCode =
  | "smtp_auth"
  | "invalid_recipient"
  | "smtp_connection"
  | "smtp_temporary"
  | "smtp_rejected"
  | "other";

type CampaignResult = {
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
  deliveryIssues?: Partial<Record<DeliveryIssueCode, number>>;
};
type CampaignRecipientActivity = {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  status: string;
  sentAt: string;
  openedAt: string;
  clickedAt: string;
  submittedAt: string;
  reportedAt: string;
  failedAt: string;
};
type AssetOperation = {
  id: string;
  type: string;
  name: string;
  status: string;
  result: string | null;
  encryptedResult?: EncryptedReturn | null;
};

type CampaignAudienceGroup = {
  id: number;
  name: string;
  numTargets: number;
  modifiedDate: string;
};
type CampaignEmailTemplate = { id: number; name: string; modifiedDate: string };
type CampaignLandingPage = {
  id: number;
  name: string;
  captureCredentials: boolean | null;
  capturePasswords: boolean | null;
  modifiedDate: string;
};
type CampaignSendingProfile = {
  id: number;
  name: string;
  modifiedDate: string;
};
type Snapshot = {
  updatedAt: string;
  capabilities?: {
    profileUpdates?: boolean;
    assetEdits?: boolean;
    individualResults?: boolean;
  };
  campaigns: CampaignResult[];
  groups: CampaignAudienceGroup[];
  templates: CampaignEmailTemplate[];
  pages: CampaignLandingPage[];
  sendingProfiles: CampaignSendingProfile[];
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
      return "Aguardando conexão";
    case "processing":
      return "Em execução";
    case "succeeded":
      return "Campanha criada";
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

function campaignStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("progress")) return "Em andamento";
  if (normalized.includes("complete")) return "Concluída";
  if (normalized.includes("schedule") || normalized.includes("queue"))
    return "Agendada";
  if (normalized.includes("cancel")) return "Cancelada";
  if (normalized.includes("start")) return "Iniciando";
  return status || "—";
}

const deliveryIssueMessages: Record<DeliveryIssueCode, string> = {
  smtp_auth:
    "Autenticação do perfil de envio recusada. Confira usuário e senha.",
  invalid_recipient:
    "O servidor recusou destinatário. Confira os endereços do grupo.",
  smtp_connection:
    "Não foi possível conectar ao servidor. Confira host, porta e TLS.",
  smtp_temporary: "O servidor adiou ou limitou o envio temporariamente.",
  smtp_rejected:
    "O servidor recusou a mensagem. Confira o remetente e a política do provedor.",
  other: "O serviço registrou o erro, mas não informou a causa técnica.",
};

function campaignDeliverySummary(campaign: CampaignResult) {
  const { sent, error, total } = campaign.stats;
  if (error <= 0) return null;
  const deliveryCount = `${numberFormat(error)} erro(s) em ${numberFormat(total)} destinatário(s)`;
  const status =
    sent === 0
      ? `Nenhum e-mail foi aceito; ${deliveryCount}.`
      : `${numberFormat(sent)} e-mail(s) aceito(s); ${deliveryCount}.`;
  const causes = Object.entries(campaign.deliveryIssues ?? {})
    .filter((entry): entry is [DeliveryIssueCode, number] => entry[1] > 0)
    .map(
      ([code, count]) =>
        `${numberFormat(count)}: ${deliveryIssueMessages[code]}`,
    );
  const explanation = causes.length
    ? causes.join(" ")
    : "O registro atual só tem a contagem. O detalhe aparece após o conector sincronizar o diagnóstico.";
  return `${status} ${explanation}`;
}

function campaignDeliveryStatus(campaign: CampaignResult) {
  if (campaign.stats.error > 0)
    return campaign.stats.sent > 0 ? "Envio parcial" : "Falha no envio";
  return campaignStatus(campaign.status);
}

export function CampaignWorkspaceContent({ view }: { view: CampaignPageView }) {
  const router = useRouter();
  const { session } = useAuth();
  const activeWorkspaceId = useActiveWorkspaceId();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingPairing, setCreatingPairing] = useState(false);
  const [connectorName, setConnectorName] = useState("Piersec campanhas");
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
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [confirmingCampaign, setConfirmingCampaign] = useState(false);
  const [operations, setOperations] = useState<CampaignOperation[]>([]);
  const [operationsError, setOperationsError] = useState("");
  const [campaignConnectorId, setCampaignConnectorId] = useState("");
  const [campaignStep, setCampaignStep] = useState(1);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignPageSize, setCampaignPageSize] = useState(10);
  const [pendingCampaignActivity, setPendingCampaignActivity] = useState<{
    commandId: string;
    campaignId: number;
    campaignName: string;
    privateKey: CryptoKey;
  } | null>(null);
  const [campaignActivity, setCampaignActivity] = useState<{
    campaignId: number;
    campaignName: string;
    status: string;
    recipients: CampaignRecipientActivity[];
    truncated: boolean;
  } | null>(null);
  const [campaignActivityError, setCampaignActivityError] = useState("");
  const [loadingActivityCampaignId, setLoadingActivityCampaignId] = useState<
    number | null
  >(null);
  const activityHandledRef = useRef("");
  const activityPollInFlightRef = useRef(false);

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
          `/api/campaigns/connection?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
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
        `/api/campaigns/history?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
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
  const campaignPageCount = Math.max(
    1,
    Math.ceil(campaigns.length / campaignPageSize),
  );
  const paginatedCampaigns = campaigns.slice(
    (campaignPage - 1) * campaignPageSize,
    campaignPage * campaignPageSize,
  );
  const estimatedRecipientCount = groups
    .filter((group) => selectedGroupIds.includes(group.id))
    .reduce((total, group) => total + group.numTargets, 0);

  useEffect(() => {
    setCampaignPage((currentPage) => Math.min(currentPage, campaignPageCount));
  }, [campaignPageCount]);

  async function requestCampaignActivity(campaign: CampaignResult) {
    if (!session?.access_token || !campaignConnector) {
      setCampaignActivityError(
        "Conecte o ambiente antes de carregar os resultados.",
      );
      return;
    }
    if (campaignConnector.snapshot?.capabilities?.individualResults !== true) {
      setCampaignActivityError(
        "Atualize a Stack do conector no Portainer para consultar resultados individuais.",
      );
      return;
    }
    setLoadingActivityCampaignId(campaign.id);
    setCampaignActivityError("");
    setCampaignActivity(null);
    try {
      const returnKey = await createSecureReturnKey();
      const response = await fetch("/api/campaigns/assets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          connectorId: campaignConnector.id,
          type: "campaign_results",
          action: "read",
          assetId: campaign.id,
          responsePublicKey: returnKey.publicKey,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(
            body,
            "Não foi possível solicitar a atividade da campanha.",
          ),
        );
      setPendingCampaignActivity({
        commandId: body.commandId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        privateKey: returnKey.privateKey,
      });
    } catch (cause) {
      setLoadingActivityCampaignId(null);
      setCampaignActivityError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível solicitar a atividade da campanha.",
      );
    }
  }

  useEffect(() => {
    if (!pendingCampaignActivity || !session?.access_token) return;
    const pending = pendingCampaignActivity;
    const timer = window.setInterval(async () => {
      if (activityPollInFlightRef.current) return;
      activityPollInFlightRef.current = true;
      try {
        const response = await fetch(
          `/api/campaigns/assets?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const operation = (body.operations ?? []).find(
          (item: AssetOperation) => item.id === pending.commandId,
        ) as AssetOperation | undefined;
        if (!operation) return;
        if (operation.status === "succeeded" && operation.encryptedResult) {
          if (activityHandledRef.current === operation.id) return;
          activityHandledRef.current = operation.id;
          const result = await decryptSecureReturn<{
            status?: string;
            recipients?: CampaignRecipientActivity[];
            truncated?: boolean;
          }>(operation.encryptedResult, pending.privateKey);
          const recipients = Array.isArray(result.recipients)
            ? result.recipients
            : [];
          const truncated = result.truncated === true;
          setCampaignActivity({
            campaignId: pending.campaignId,
            campaignName: pending.campaignName,
            status: typeof result.status === "string" ? result.status : "",
            recipients,
            truncated,
          });
          let responseCleared = false;
          try {
            const acknowledgment = await fetch("/api/campaigns/assets", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                workspaceId: activeWorkspaceId,
                action: "ack",
                commandId: operation.id,
              }),
            });
            responseCleared = acknowledgment.ok;
          } catch {
            responseCleared = false;
          }
          if (!truncated) {
            const opened = recipients.filter((item) => item.openedAt).length;
            const clicked = recipients.filter((item) => item.clickedAt).length;
            const submittedData = recipients.filter(
              (item) => item.submittedAt,
            ).length;
            const sent = recipients.filter((item) => item.sentAt).length;
            const reported = recipients.filter(
              (item) => item.reportedAt,
            ).length;
            const failed = recipients.filter((item) => item.failedAt).length;
            setConnectors((current) =>
              current.map((connector) =>
                connector.id !== campaignConnector?.id
                  ? connector
                  : {
                      ...connector,
                      snapshot: {
                        ...connector.snapshot,
                        campaigns: connector.snapshot.campaigns.map((item) =>
                          item.id !== pending.campaignId
                            ? item
                            : {
                                ...item,
                                stats: {
                                  ...item.stats,
                                  total: Math.max(
                                    item.stats.total,
                                    recipients.length,
                                  ),
                                  sent,
                                  opened,
                                  clicked,
                                  submittedData,
                                  emailReported: reported,
                                  error: failed,
                                },
                              },
                        ),
                      },
                    },
              ),
            );
          }
          setPendingCampaignActivity(null);
          setLoadingActivityCampaignId(null);
          toast.success("Atividade atualizada", {
            description: responseCleared
              ? "Os resultados foram consultados pela conexão privada e a resposta cifrada foi removida."
              : "Os resultados foram consultados pela conexão privada. A resposta continua cifrada e será removida automaticamente.",
          });
        } else if (
          ["failed", "uncertain", "expired"].includes(operation.status)
        ) {
          setCampaignActivityError(
            operation.result ?? "Não foi possível carregar os resultados.",
          );
          setPendingCampaignActivity(null);
          setLoadingActivityCampaignId(null);
        }
      } catch (cause) {
        setCampaignActivityError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível abrir os resultados protegidos.",
        );
        setPendingCampaignActivity(null);
        setLoadingActivityCampaignId(null);
      } finally {
        activityPollInFlightRef.current = false;
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [
    activeWorkspaceId,
    campaignConnector?.id,
    pendingCampaignActivity,
    session?.access_token,
  ]);
  async function createPairing() {
    if (!session?.access_token) {
      setError("Entre novamente para parear o conector.");
      return;
    }
    setCreatingPairing(true);
    setError("");
    setPairing(null);
    try {
      const response = await fetch("/api/campaigns/connection/pairing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          connectorName: connectorName.trim() || "Piersec campanhas",
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
      setError("Ative uma conexão de campanhas antes de continuar.");
      return;
    }
    setCreatingPreview(true);
    setError("");
    setPreview(null);
    try {
      const response = await fetch("/api/campaigns/preview", {
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
      setCampaignStep(4);
      setConfirmationChecked(false);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível preparar a prévia.";
      setError(message);
      toast.error("Não foi possível preparar a revisão", {
        description: message,
      });
    } finally {
      setCreatingPreview(false);
    }
  }

  async function confirmCampaign(): Promise<boolean> {
    if (!session?.access_token || !preview) return false;
    setConfirmingCampaign(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          previewId: preview.previewId,
          confirmation: preview.campaignName,
          accepted: confirmationChecked,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Não foi possível confirmar a campanha."),
        );
      setPreview(null);
      setConfirmationChecked(false);
      toast.success("Confirmação registrada", {
        description:
          "O agente Docker buscará a ordem e atualizará o histórico.",
      });
      await loadOperations();
      router.push("/campanhas/atividade");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar a campanha.",
      );
      return false;
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
        : "Não conectado";

  return (
    <DashboardShell
      activeSection="campaigns"
      title={
        view === "new"
          ? "Nova campanha"
          : view === "groups"
            ? "Grupos"
            : view === "activity"
              ? "Atividade"
              : view === "connection"
                ? "Conexão"
                : "Campanhas"
      }
      headerAction={
        view === "campaigns" ? (
          <Link
            href="/campanhas/nova"
            className="campaign-primary-action inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-bold transition-colors"
          >
            Nova campanha
          </Link>
        ) : view === "new" ? (
          <Link
            href="/campanhas"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            Voltar às campanhas
          </Link>
        ) : view === "groups" ? (
          <Link
            href="/campanhas/grupos/nova"
            className="campaign-primary-action inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-bold transition-colors"
          >
            Novo grupo
          </Link>
        ) : undefined
      }
    >
      <div className="grid gap-4">
        <CampaignsNavigation current={view} />
        {error && (
          <p
            className="campaign-workspace-error m-0 rounded-[14px] border px-4 py-3 text-[12px]"
            role="alert"
          >
            {error}
          </p>
        )}
        {view === "connection" && (
          <>
            <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-[700px]">
                  <h2 className="mt-2 mb-0 text-[22px] font-semibold tracking-[-0.05em]">
                    Conecte o ambiente de campanhas
                  </h2>
                  <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    Uma Stack Docker no Portainer acessa o serviço pela rede
                    privada e inicia conexões HTTPS de saída para o Piersec. A
                    chave de API fica em um segredo montado no contêiner; não
                    passa pelo navegador nem é armazenada na nuvem.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[11px] font-bold ${connected ? "bg-[#e8f4ed] text-[#28744c]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}
                  >
                    <span
                      className={`size-2 rounded-full ${connected ? "bg-[#3a9a68]" : "bg-[#a4adb2]"}`}
                    />
                    {statusLabel}
                  </span>
                  <button
                    className="grid size-9 place-items-center rounded-full border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
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
                <p className="mt-4 mb-0 text-[11px] text-[var(--text-muted)]">
                  {connected.name} · última atualização{" "}
                  {dateFormat(snapshot?.updatedAt)}
                </p>
              )}
            </section>

            <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
                <div>
                  <h3 className="mt-2 mb-0 text-[17px] font-semibold tracking-[-0.04em]">
                    Stack Docker no Portainer
                  </h3>
                  <ol className="mt-4 grid gap-2 pl-5 text-[12px] leading-relaxed text-[var(--text-muted)] marker:font-bold marker:text-[var(--ink)]">
                    <li>Gere um código de pareamento válido por 10 minutos.</li>
                    <li>
                      Crie uma Stack a partir do repositório PierPhish, branch
                      <code className="mx-1 rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[11px]">
                        main
                      </code>
                      , usando o arquivo
                      <code className="mx-1 rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[11px]">
                        deploy/portainer/campaign-bridge.compose.yaml
                      </code>
                      .
                    </li>
                    <li>
                      Informe a URL e a rede privada do serviço, o código
                      temporário e os caminhos dos dois arquivos secretos no
                      host Docker.
                    </li>
                  </ol>
                  <p className="mt-4 mb-0 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    A Stack não publica portas. O contêiner só inicia tráfego de
                    saída para o Piersec e acessa o serviço pela rede Docker
                    selecionada. Após o pareamento, remova o código temporário
                    das variáveis da Stack.
                  </p>
                </div>
                <div className="rounded-[17px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4">
                  <label className="grid gap-2 text-[11px] font-semibold text-[var(--text-muted)]">
                    Nome dessa conexão
                    <input
                      className="h-10 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal tracking-normal text-[var(--ink)] normal-case outline-none focus:border-[var(--accent)]"
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
                      : "Gerar código para a Stack"}
                    <Icon name="arrow" size={14} />
                  </button>
                  {pairing && (
                    <div className="mt-3 rounded-[12px] border border-[#d9e8dc] bg-[#f4faf5] p-3">
                      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#52765d]">
                        Código de uso único
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
                        Expira às {dateFormat(pairing.expiresAt)}. O código não
                        será exibido novamente.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {!isSupabaseConfigured && (
              <p className="m-0 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[12px] text-[var(--text-muted)]">
                A conexão não está disponível neste ambiente. Solicite a
                ativação ao administrador.
              </p>
            )}
          </>
        )}

        {view === "new" && (
          <>
            <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
              <div className="max-w-[740px]">
                <h3 className="mt-2 mb-0 text-[18px] font-semibold tracking-[-0.04em]">
                  Configure a campanha
                </h3>
                <p className="mt-2 mb-0 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  Escolha o conteúdo, o público e o horário. A campanha só entra
                  na fila depois da revisão final e da confirmação explícita.
                </p>
              </div>

              <ol
                className="mt-5 grid grid-cols-4 gap-2"
                aria-label="Etapas de criação da campanha"
              >
                {["Conteúdo", "Público", "Agenda", "Revisão"].map(
                  (label, index) => {
                    const step = index + 1;
                    const active = campaignStep === step;
                    const complete = campaignStep > step;
                    return (
                      <li
                        key={label}
                        aria-current={active ? "step" : undefined}
                        className={`border-b-2 pb-2 text-[11px] font-semibold ${active ? "border-[var(--ink)] text-[var(--ink)]" : complete ? "border-[#8db69c] text-[var(--ink)]" : "border-[var(--line-soft)] text-[var(--text-muted)]"}`}
                      >
                        <span className="mr-1.5 tabular-nums">{step}</span>
                        {label}
                      </li>
                    );
                  },
                )}
              </ol>

              {!campaignConnector && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
                  <span>
                    Conecte o ambiente de campanhas para carregar os ativos.
                  </span>
                  <Link
                    className="font-bold text-[var(--ink)] underline underline-offset-4"
                    href="/campanhas/conexao"
                  >
                    Configurar conexão
                  </Link>
                </div>
              )}

              {onlineConnectors.length > 1 && (
                <label className="mt-4 grid max-w-[420px] gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                  AMBIENTE DE ENVIO
                  <select
                    className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                    value={campaignConnector?.id ?? ""}
                    onChange={(event) =>
                      setCampaignConnectorId(event.target.value)
                    }
                  >
                    {onlineConnectors.map((connector) => (
                      <option key={connector.id} value={connector.id}>
                        {connector.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {campaignStep === 1 && (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      NOME DA CAMPANHA
                      <input
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                        value={campaignName}
                        maxLength={120}
                        onChange={(event) =>
                          setCampaignName(event.target.value)
                        }
                        placeholder="Ex.: Treinamento de segurança — setembro"
                      />
                    </label>
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      MODELO DE E-MAIL
                      <select
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
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
                      <Link
                        href="/campanhas/modelos/novo"
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit text-[9px] font-semibold text-[var(--ink)] underline underline-offset-4"
                      >
                        Criar modelo no PierSec
                      </Link>
                    </label>
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      PÁGINA DE DESTINO
                      <select
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
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
                            <option
                              key={page.id}
                              value={page.id}
                              disabled={unsafe}
                            >
                              {page.name}
                              {unsafe
                                ? " · bloqueada: captura dados de acesso"
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                      <Link
                        href="/campanhas/paginas/nova"
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit text-[9px] font-semibold text-[var(--ink)] underline underline-offset-4"
                      >
                        Criar página no PierSec
                      </Link>
                    </label>
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      PERFIL DE ENVIO
                      <select
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                        value={sendingProfileId}
                        onChange={(event) =>
                          setSendingProfileId(event.target.value)
                        }
                      >
                        <option value="">Selecione um perfil</option>
                        {sendingProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] font-normal">
                        Apenas o nome aparece aqui; as credenciais ficam no
                        ambiente conectado.
                      </span>
                      <Link
                        href="/campanhas/envio"
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit text-[9px] font-semibold text-[var(--ink)] underline underline-offset-4"
                      >
                        Gerenciar perfis de envio
                      </Link>
                    </label>
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)] md:col-span-2">
                      URL DE DESTINO HTTPS
                      <input
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                        type="url"
                        inputMode="url"
                        value={destinationUrl}
                        onChange={(event) =>
                          setDestinationUrl(event.target.value)
                        }
                        placeholder="https://treinamento.sua-empresa.example"
                      />
                      <span className="text-[9px] font-normal">
                        Use apenas ambientes de treinamento autorizados. A
                        página escolhida não pode capturar credenciais ou
                        senhas.
                      </span>
                    </label>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--ink)] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={() => setCampaignStep(2)}
                      disabled={
                        !campaignName.trim() ||
                        !templateId ||
                        !pageId ||
                        !sendingProfileId ||
                        !destinationUrl.trim() ||
                        !campaignConnector
                      }
                    >
                      Continuar para público
                    </button>
                  </div>
                </>
              )}

              {campaignStep === 2 && (
                <>
                  <fieldset className="mt-5 rounded-[14px] border border-[var(--line-soft)] p-4">
                    <legend className="px-1 text-[10px] font-bold text-[var(--text-muted)]">
                      GRUPOS · {numberFormat(estimatedRecipientCount)}{" "}
                      destinatário(s) estimado(s)
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
                            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                              {numberFormat(group.numTargets)}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <p className="m-0 text-[11px] text-[var(--text-muted)]">
                          Nenhum grupo sincronizado ainda.
                        </p>
                        <Link
                          href="/campanhas/grupos/nova"
                          target="_blank"
                          rel="noreferrer"
                          className="w-fit text-[10px] font-semibold text-[var(--ink)] underline underline-offset-4"
                        >
                          Criar grupo no PierSec
                        </Link>
                      </div>
                    )}
                  </fieldset>
                  <div className="mt-5 flex flex-wrap justify-between gap-2">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--text-muted)]"
                      type="button"
                      onClick={() => setCampaignStep(1)}
                    >
                      Voltar
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--ink)] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={() => setCampaignStep(3)}
                      disabled={
                        !selectedGroupIds.length || !estimatedRecipientCount
                      }
                    >
                      Continuar para agenda
                    </button>
                  </div>
                </>
              )}

              {campaignStep === 3 && (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(200px,0.55fr)_1fr]">
                    <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      QUANDO ENVIAR
                      <select
                        className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                        value={launchMode}
                        onChange={(event) =>
                          setLaunchMode(
                            event.target.value as "now" | "scheduled",
                          )
                        }
                      >
                        <option value="now">
                          Assim que a conexão buscar (até 30 s)
                        </option>
                        <option value="scheduled">Agendar data e hora</option>
                      </select>
                    </label>
                    {launchMode === "scheduled" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                          INÍCIO
                          <input
                            className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                            type="datetime-local"
                            value={launchAtInput}
                            onChange={(event) =>
                              setLaunchAtInput(event.target.value)
                            }
                          />
                        </label>
                        <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                          ENVIAR ATÉ · OPCIONAL
                          <input
                            className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                            type="datetime-local"
                            value={sendByInput}
                            onChange={(event) =>
                              setSendByInput(event.target.value)
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-between gap-2">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--text-muted)]"
                      type="button"
                      onClick={() => setCampaignStep(2)}
                    >
                      Voltar
                    </button>
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
                      {creatingPreview
                        ? "Montando prévia…"
                        : "Revisar e conferir"}
                    </button>
                  </div>
                </>
              )}
            </section>

            {view === "new" && campaignStep === 4 && preview && (
              <section className="surface-card rounded-[22px] border border-[#e7d5a4] bg-[#fffcf3] p-6 max-[720px]:p-4">
                <h3 className="mt-0 mb-0 text-[17px] font-semibold tracking-[-0.04em] text-[var(--ink)]">
                  Revise antes de confirmar
                </h3>
                <p className="mt-1 mb-0 text-[11px] text-[#856c30]">
                  A prévia expira {dateFormat(preview.expiresAt)}.
                </p>
                <p className="mt-3 mb-0 text-[14px] font-semibold text-[var(--ink)]">
                  {preview.campaignName}
                </p>
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
                      : "Assim que a conexão buscar a ordem (até 30 s)"}
                  </p>
                  {preview.sendBy && (
                    <p className="m-0">
                      <strong>Prazo de envio:</strong>{" "}
                      {dateFormat(preview.sendBy)}
                    </p>
                  )}
                </div>
                <div className="mt-4 rounded-[11px] border border-[#ead8a8] bg-white/70 p-3 text-[11px] leading-relaxed text-[#6f5b2c]">
                  Confirmar coloca uma ordem de uso único na fila. Quando o
                  agente Docker a receber, o envio pode começar imediatamente ou
                  no horário agendado. Confira o grupo e o total antes de
                  continuar.
                </div>
                <div className="mt-4 flex max-w-[760px] flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="grid flex-1 gap-3">
                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--ink)]">
                      <input
                        className="mt-0.5"
                        type="checkbox"
                        checked={confirmationChecked}
                        onChange={(event) =>
                          setConfirmationChecked(event.target.checked)
                        }
                      />
                      Confirmo que tenho autorização para executar esta campanha
                      neste ambiente de treinamento.
                    </label>
                    <SlideToConfirm
                      className="max-w-[520px]"
                      text="Deslize para confirmar a campanha"
                      successText="Confirmação registrada"
                      disabled={!confirmationChecked || confirmingCampaign}
                      onConfirm={confirmCampaign}
                    />
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--text-muted)]"
                    type="button"
                    disabled={confirmingCampaign}
                    onClick={() => {
                      setPreview(null);
                      setCampaignStep(3);
                    }}
                  >
                    Cancelar prévia
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {view === "activity" && (
          <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
            <CampaignSectionHeader imageSrc="/campaign-banners/activity.png">
              <div>
                <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                  Histórico de solicitações
                </h3>
                <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                  Solicitante, grupos, estimativa e resultado de cada ordem
                  confirmada.
                </p>
              </div>
              <button
                className="rounded-[8px] border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]"
                type="button"
                onClick={() => void loadOperations()}
              >
                Atualizar
              </button>
            </CampaignSectionHeader>
            {operationsError ? (
              <p className="m-0 px-5 py-5 text-[11px] text-[var(--text-muted)]">
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
                      <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-muted)]">
                        {operation.groups
                          .map(
                            (group) =>
                              `${group.name} (${numberFormat(group.numTargets)})`,
                          )
                          .join(", ")}{" "}
                        · {numberFormat(operation.recipientCount)}{" "}
                        destinatário(s) · {operation.template} ·{" "}
                        {operation.page}
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                        Solicitante: {operation.requestedBy} · confirmada{" "}
                        {dateFormat(operation.queuedAt)} · início{" "}
                        {operation.launchAt
                          ? dateFormat(operation.launchAt)
                          : "imediato"}
                        {operation.sendBy
                          ? ` · prazo ${dateFormat(operation.sendBy)}`
                          : ""}
                      </span>
                      {operation.result && (
                        <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                          {operation.result}
                        </span>
                      )}
                    </div>
                    <span className="h-fit rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                      {operationStatus(operation.status)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="m-0 px-5 py-6 text-center text-[11px] text-[var(--text-muted)]">
                Nenhuma campanha confirmada pelo Piersec.
              </p>
            )}
          </section>
        )}

        {view === "campaigns" && (
          <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
            <CampaignSectionHeader imageSrc="/campaign-banners/campaigns.png">
              <div>
                <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                  Campanhas e resultados
                </h3>
                <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                  Enviados foram aceitos pelo servidor de e-mail; isso não
                  garante chegada à caixa de entrada. Falhas mostram rejeições
                  e, quando disponível, a causa técnica.
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-[var(--text-muted)]">
                  {numberFormat(campaigns.length)} campanha(s)
                </span>
                <span className="mt-1 block text-[9px] text-[var(--text-muted)]">
                  Dados de {dateFormat(snapshot?.updatedAt)}
                </span>
              </div>
            </CampaignSectionHeader>
            {campaigns.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1020px] border-collapse text-left text-[11px]">
                    <thead className="bg-[var(--surface-soft)] text-[9px] font-extrabold tracking-[0.1em] text-[var(--text-muted)] uppercase">
                      <tr>
                        <th className="px-5 py-3">Campanha</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Destinatários</th>
                        <th
                          className="px-4 py-3 text-right"
                          title="E-mails que o servidor de envio aceitou. Isso não confirma chegada à caixa de entrada."
                        >
                          Enviados
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="E-mails que tiveram erro durante o envio."
                        >
                          Falhas
                        </th>
                        <th className="px-4 py-3 text-right">Abertos</th>
                        <th className="px-4 py-3 text-right">Cliques</th>
                        <th className="px-4 py-3 text-right">Dados</th>
                        <th className="px-5 py-3">Início</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCampaigns.map((campaign) => (
                        <tr
                          className="border-t border-[var(--line-soft)]"
                          key={campaign.id}
                        >
                          <td className="px-5 py-3.5">
                            <strong className="block text-[11px] text-[var(--ink)]">
                              {campaign.name}
                            </strong>
                            <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                              {[campaign.template, campaign.page]
                                .filter(Boolean)
                                .join(" · ") ||
                                "Modelo e página não informados"}
                            </span>
                            {campaign.groups.length > 0 && (
                              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                Grupos: {campaign.groups.join(", ")}
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={
                                loadingActivityCampaignId === campaign.id
                              }
                              onClick={() =>
                                void requestCampaignActivity(campaign)
                              }
                              className="mt-2 inline-flex h-8 items-center justify-center rounded-full border border-[var(--line)] px-3 text-[10px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
                            >
                              {loadingActivityCampaignId === campaign.id
                                ? "Atualizando…"
                                : "Ver atividade individual"}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-[var(--text-muted)]">
                            <span>{campaignDeliveryStatus(campaign)}</span>
                            {campaignDeliverySummary(campaign) && (
                              <span className="mt-1 block max-w-[240px] text-[9px] leading-relaxed text-[var(--danger)]">
                                {campaignDeliverySummary(campaign)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums">
                            {numberFormat(campaign.stats.total)}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums">
                            {numberFormat(campaign.stats.sent)}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums">
                            {numberFormat(campaign.stats.error)}
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
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">
                            {dateFormat(campaign.launchAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CampaignPagination
                  currentPage={campaignPage}
                  pageSize={campaignPageSize}
                  totalItems={campaigns.length}
                  totalPages={campaignPageCount}
                  onPageChange={setCampaignPage}
                  onPageSizeChange={(size) => {
                    setCampaignPageSize(size);
                    setCampaignPage(1);
                  }}
                />
              </>
            ) : (
              <div className="px-5 py-10 text-center">
                <strong className="block text-[12px] text-[var(--ink)]">
                  {loading
                    ? "Carregando campanhas…"
                    : "Nenhuma campanha sincronizada"}
                </strong>
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                  {connectors.length
                    ? "Verifique se a Stack Docker está ativa no Portainer."
                    : "Configure a conexão para carregar campanhas e resultados."}
                </span>
              </div>
            )}
          </section>
        )}

        {view === "campaigns" && campaignActivityError && (
          <p
            role="alert"
            className="m-0 rounded-[12px] border border-[#ead5d5] bg-[#fff7f7] px-4 py-3 text-[11px] text-[#8b3d3d]"
          >
            {campaignActivityError}
          </p>
        )}

        {view === "campaigns" && campaignActivity && (
          <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
              <div>
                <h3 className="m-0 text-[14px] font-semibold text-[var(--ink)]">
                  Atividade individual · {campaignActivity.campaignName}
                </h3>
                <p className="mt-1 mb-0 max-w-[720px] text-[10px] leading-relaxed text-[var(--text-muted)]">
                  Consultado agora no ambiente conectado. Mostramos somente
                  eventos de envio, abertura, clique, envio de dados e denúncia;
                  IP, navegador e conteúdo enviado não são exibidos nem
                  armazenados em texto aberto.
                </p>
                {campaignActivity.truncated && (
                  <p className="mt-2 mb-0 text-[10px] text-[var(--text-muted)]">
                    Exibindo os primeiros 500 destinatários. Os totais agregados
                    da campanha continuam completos.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCampaignActivity(null)}
                className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--line)] px-3 text-[10px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Fechar
              </button>
            </div>
            {campaignActivity.recipients.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left text-[10px]">
                  <thead className="bg-[var(--surface-soft)] text-[9px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                    <tr>
                      <th className="px-5 py-3">Destinatário</th>
                      <th className="px-3 py-3">Envio</th>
                      <th className="px-3 py-3">Abertura</th>
                      <th className="px-3 py-3">Clique</th>
                      <th className="px-3 py-3">Dados enviados</th>
                      <th className="px-5 py-3">Denúncia / falha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignActivity.recipients.map((recipient) => {
                      const personName = [
                        recipient.firstName,
                        recipient.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <tr
                          key={`${campaignActivity.campaignId}:${recipient.email}`}
                          className="border-t border-[var(--line-soft)]"
                        >
                          <td className="px-5 py-3">
                            <strong className="block font-semibold text-[var(--ink)]">
                              {recipient.email}
                            </strong>
                            {personName && (
                              <span className="mt-0.5 block text-[var(--text-muted)]">
                                {personName}
                                {recipient.position
                                  ? ` · ${recipient.position}`
                                  : ""}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">
                            {recipient.failedAt
                              ? "Falhou"
                              : recipient.sentAt
                                ? dateFormat(recipient.sentAt)
                                : "Pendente"}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">
                            {recipient.openedAt
                              ? dateFormat(recipient.openedAt)
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">
                            {recipient.clickedAt
                              ? dateFormat(recipient.clickedAt)
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-muted)]">
                            {recipient.submittedAt
                              ? dateFormat(recipient.submittedAt)
                              : "—"}
                          </td>
                          <td className="px-5 py-3 text-[var(--text-muted)]">
                            {recipient.reportedAt
                              ? `Denunciado · ${dateFormat(recipient.reportedAt)}`
                              : recipient.failedAt
                                ? dateFormat(recipient.failedAt)
                                : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="m-0 px-5 py-7 text-center text-[11px] text-[var(--text-muted)]">
                Nenhum evento individual registrado até agora.
              </p>
            )}
          </section>
        )}

        {view === "groups" && (
          <section className="surface-card overflow-hidden rounded-[22px] border border-[var(--card-border)]">
            <CampaignSectionHeader imageSrc="/campaign-banners/groups.png">
              <div>
                <h3 className="m-0 text-[15px] font-semibold tracking-[-0.03em]">
                  Grupos disponíveis
                </h3>
                <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                  Somente nome e quantidade de destinatários.
                </p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                {numberFormat(groups.length)} grupo(s)
              </span>
            </CampaignSectionHeader>
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
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                        {numberFormat(group.numTargets)} pessoas
                      </span>
                      <Link
                        href={`/campanhas/grupos/nova?edit=${group.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--line)] px-3 text-[10px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 px-5 py-7 text-center text-[11px] text-[var(--text-muted)]">
                {loading
                  ? "Carregando grupos…"
                  : "Ainda não há grupos neste ambiente. Crie o primeiro pelo PierSec."}
              </p>
            )}
          </section>
        )}

        {snapshot && (view === "campaigns" || view === "groups") && (
          <p className="m-0 px-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
            A lista de pessoas e os resultados individuais só são carregados
            quando solicitados e trafegam cifrados para esta sessão. IPs,
            navegadores e dados submetidos não são exibidos nem armazenados em
            texto aberto.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
