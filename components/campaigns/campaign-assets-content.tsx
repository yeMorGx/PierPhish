"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { CampaignsNavigation } from "@/components/campaigns/campaigns-navigation";
import { CampaignSectionHeader } from "@/components/campaigns/campaign-section-header";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";

type AssetSection = "templates" | "pages" | "sendingProfiles";
type Connector = {
  id: string;
  name: string;
  online: boolean;
  snapshot?: {
    capabilities?: { profileUpdates?: boolean };
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

const bannerSources: Record<AssetSection, string> = {
  templates: "/campaign-banners/templates.png",
  pages: "/campaign-banners/pages.png",
  sendingProfiles: "/campaign-banners/sending-profiles.png",
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

function operationStatusLabel(operation: Operation) {
  if (
    operation.status === "succeeded" &&
    operation.result === "Acesso do perfil atualizado."
  )
    return "Atualizado";
  return statusLabel(operation.status);
}

export function CampaignAssetsContent({ section }: { section: AssetSection }) {
  const { session } = useAuth();
  const workspaceId = useActiveWorkspaceId();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfileId, setSavingProfileId] = useState<number | null>(null);
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

  function startProfileUpdate(profile: AssetSummary) {
    setEditingProfileId(profile.id);
    setProfileUsername("");
    setProfilePassword("");
    setProfileError("");
  }

  function cancelProfileUpdate() {
    setEditingProfileId(null);
    setProfileUsername("");
    setProfilePassword("");
    setProfileError("");
  }

  async function updateProfileCredentials(
    event: FormEvent<HTMLFormElement>,
    profile: AssetSummary,
  ) {
    event.preventDefault();
    if (!connected || !session?.access_token) {
      setProfileError("A conexão de campanhas precisa estar online.");
      return;
    }
    if (!profileUsername.trim() || !profilePassword) {
      setProfileError(
        "Informe o usuário e a nova senha do servidor de e-mail.",
      );
      return;
    }

    setSavingProfileId(profile.id);
    setProfileError("");
    try {
      const response = await fetch("/api/campaigns/assets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          connectorId: connected.id,
          type: "sending_profile",
          profileId: profile.id,
          name: profile.name,
          username: profileUsername,
          password: profilePassword,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Não foi possível atualizar o acesso."),
        );

      cancelProfileUpdate();
      void refresh();
      toast.success("Atualização registrada", {
        description:
          "O acesso será atualizado pela conexão privada. Isso não envia e-mails.",
      });
    } catch (cause) {
      setProfileError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o acesso.",
      );
    } finally {
      setSavingProfileId(null);
      setProfilePassword("");
    }
  }

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
          <CampaignSectionHeader imageSrc={bannerSources[section]}>
            <div>
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.03em]">
                {config.title}
              </h2>
              <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                {section === "sendingProfiles"
                  ? "Configure o acesso ao servidor de e-mail usado nas campanhas."
                  : "Ativos disponíveis para montar uma campanha dentro do PierSec."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${connected ? "bg-[#e8f4ed] text-[#28744c]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}
            >
              {connected ? "Ambiente conectado" : "Sem conexão ativa"}
            </span>
          </CampaignSectionHeader>
          {assets.length ? (
            <div className="divide-y divide-[var(--line-soft)]">
              {assets.map((asset) => {
                const editing =
                  section === "sendingProfiles" &&
                  editingProfileId === asset.id;
                return (
                  <div key={asset.id} className="grid gap-4 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-[12px] text-[var(--ink)]">
                          {asset.name}
                        </strong>
                        {section === "pages" && (
                          <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                            {asset.captureCredentials === false &&
                            asset.capturePasswords === false
                              ? "Sem captura de credenciais"
                              : "Bloqueada para campanhas"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Atualizado {dateFormat(asset.modifiedDate)}
                        </span>
                        {section !== "sendingProfiles" && connected && (
                          <Link
                            href={`${config.href}?edit=${asset.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[10px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                          >
                            Editar
                          </Link>
                        )}
                        {section === "sendingProfiles" && (
                          <button
                            type="button"
                            disabled={
                              savingProfileId !== null ||
                              connected?.snapshot?.capabilities
                                ?.profileUpdates !== true ||
                              (!connected && !editing)
                            }
                            aria-expanded={editing}
                            aria-controls={`profile-update-${asset.id}`}
                            onClick={() =>
                              editing
                                ? cancelProfileUpdate()
                                : startProfileUpdate(asset)
                            }
                            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[10px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {editing ? "Cancelar" : "Corrigir acesso"}
                          </button>
                        )}
                      </div>
                    </div>
                    {section === "sendingProfiles" &&
                      connected &&
                      connected.snapshot?.capabilities?.profileUpdates !==
                        true && (
                        <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
                          Atualize a Stack do conector no Portainer para editar
                          este perfil com segurança.
                        </p>
                      )}
                    {editing && (
                      <form
                        id={`profile-update-${asset.id}`}
                        onSubmit={(event) =>
                          void updateProfileCredentials(event, asset)
                        }
                        className="grid gap-4 rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] p-4"
                      >
                        <div>
                          <h3 className="m-0 text-[12px] font-semibold text-[var(--ink)]">
                            Atualizar acesso de {asset.name}
                          </h3>
                          <p className="mt-1 mb-0 max-w-[620px] text-[10px] leading-relaxed text-[var(--text-muted)]">
                            O usuário e a senha salvos não são exibidos. Informe
                            as credenciais SMTP corretas; alguns provedores
                            exigem uma senha de aplicativo. As credenciais são
                            enviadas cifradas à conexão privada e removidas da
                            fila após o processamento. Isso não envia e-mails
                            nem reenvia campanhas anteriores.
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="grid gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
                            USUÁRIO DO SERVIDOR DE E-MAIL
                            <input
                              required
                              autoComplete="username"
                              maxLength={255}
                              value={profileUsername}
                              onChange={(event) =>
                                setProfileUsername(event.target.value)
                              }
                              className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                            />
                          </label>
                          <label className="grid gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
                            NOVA SENHA
                            <input
                              required
                              type="password"
                              autoComplete="new-password"
                              maxLength={512}
                              value={profilePassword}
                              onChange={(event) =>
                                setProfilePassword(event.target.value)
                              }
                              className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                            />
                          </label>
                        </div>
                        {profileError && (
                          <p
                            role="alert"
                            className="m-0 text-[11px] text-[var(--danger)]"
                          >
                            {profileError}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            disabled={savingProfileId === asset.id}
                            className="campaign-primary-action inline-flex h-9 items-center justify-center rounded-full px-4 text-[10px] font-bold transition-colors disabled:cursor-wait disabled:opacity-60"
                          >
                            {savingProfileId === asset.id
                              ? "Salvando…"
                              : "Salvar novas credenciais"}
                          </button>
                          {!connected && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Conecte o ambiente para atualizar este perfil.
                            </span>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-9 text-center">
              <strong className="block text-[12px] text-[var(--ink)]">
                {loading
                  ? "Carregando ativos…"
                  : `Nenhum ${config.singular} disponível`}
              </strong>
              <p className="mx-auto mt-2 mb-0 max-w-[440px] text-[11px] leading-relaxed text-[var(--text-muted)]">
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
            <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
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
                    <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                      {operation.requestedBy} · {dateFormat(operation.queuedAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-[var(--ink)]">
                      {operationStatusLabel(operation)}
                    </span>
                    {operation.result && (
                      <span className="mt-1 block max-w-[320px] text-[10px] text-[var(--text-muted)]">
                        {operation.result}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 px-5 py-5 text-[11px] text-[var(--text-muted)]">
              Nenhuma operação registrada.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
