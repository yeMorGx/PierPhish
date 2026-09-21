"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import {
  demoCompanies,
  demoWorkspaces,
  readActiveWorkspaceId,
  readLocalCompanies,
  readLocalWorkspaces,
  type CompanyRecord,
  type WorkspaceEnvironment,
  type WorkspaceRole,
  type WorkspaceRecord,
  writeLocalCompanies,
  writeLocalWorkspaces,
} from "@/lib/company-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";

const superAdminEmail = "admin@teste.com";
const maxLogoSize = 2.5 * 1024 * 1024;
const acceptedLogoTypes = ["image/png", "image/jpeg", "image/webp"];

type Modal = "company" | null;

type CompanyDraft = {
  workspaceId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;
  logoUrl: string | null;
  status: "active" | "inactive";
};

const emptyCompany: CompanyDraft = {
  workspaceId: "",
  name: "",
  description: "",
  clientId: "",
  clientSecret: "",
  logoUrl: null,
  status: "active",
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "W";
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function environmentLabel(environment: WorkspaceEnvironment) {
  return environment === "production" ? "Produção" : "Teste";
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Formato de imagem inválido."));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function isAdminUser(user: ReturnType<typeof useAuth>["user"]) {
  if (!isSupabaseConfigured) return true;
  if (user?.email?.toLowerCase() === superAdminEmail) return true;
  const metadata = user?.app_metadata as
    | { role?: unknown; is_admin?: unknown }
    | undefined;
  return (
    metadata?.is_admin === true ||
    metadata?.role === "admin" ||
    metadata?.role === "owner" ||
    metadata?.role === "super_admin"
  );
}

function LogoPreview({
  logoUrl,
  fallback,
  size = "md",
}: {
  logoUrl: string | null;
  fallback: string;
  size?: "md" | "lg";
}) {
  return (
    <span className={`companies-logo companies-logo-${size}`}>
      {logoUrl ? <img src={logoUrl} alt="" /> : fallback}
    </span>
  );
}

function LogoUpload({
  logoUrl,
  fallback,
  onChange,
}: {
  logoUrl: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!acceptedLogoTypes.includes(file.type)) {
      setUploadError("Use PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > maxLogoSize) {
      setUploadError("Escolha uma imagem de até 2,5 MB.");
      return;
    }
    try {
      setUploadError(null);
      onChange(await readImage(file));
    } catch {
      setUploadError("Não foi possível preparar a imagem.");
    }
  }

  return (
    <div className="companies-logo-upload">
      <label className="companies-logo-dropzone">
        <LogoPreview logoUrl={logoUrl} fallback={fallback} size="lg" />
        <span>
          <strong>{logoUrl ? "Trocar logo" : "Adicionar logo"}</strong>
          <small>PNG, JPG ou WEBP · até 2,5 MB</small>
        </span>
        <span className="companies-logo-upload-action">Escolher arquivo</span>
        <input
          className="sr-only"
          type="file"
          accept={acceptedLogoTypes.join(",")}
          onChange={(event) => void handleChange(event)}
          aria-label={logoUrl ? "Trocar logo" : "Adicionar logo"}
        />
      </label>
      {logoUrl && (
        <button
          className="companies-logo-remove"
          type="button"
          onClick={() => onChange(null)}
        >
          Remover logo
        </button>
      )}
      {uploadError && (
        <span className="companies-field-error">{uploadError}</span>
      )}
    </div>
  );
}

export function CompanyManagementContent() {
  const { ready, user } = useAuth();
  const activeWorkspaceId = useActiveWorkspaceId();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>(
    isSupabaseConfigured ? [] : demoWorkspaces,
  );
  const [companies, setCompanies] = useState<CompanyRecord[]>(
    isSupabaseConfigured ? [] : demoCompanies,
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    isSupabaseConfigured ? "" : demoWorkspaces[0].id,
  );
  const [modal, setModal] = useState<Modal>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(
    null,
  );
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(emptyCompany);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [accessLoading, setAccessLoading] = useState(isSupabaseConfigured);
  const [activeWorkspaceRole, setActiveWorkspaceRole] =
    useState<WorkspaceRole | null>(null);
  const [localMode, setLocalMode] = useState(!isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const adminAccess =
    isAdminUser(user) ||
    activeWorkspaceRole === "owner" ||
    activeWorkspaceRole === "admin";
  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId),
    [selectedWorkspaceId, workspaces],
  );
  const workspaceCompanies = useMemo(
    () =>
      companies.filter(
        (company) => company.workspaceId === selectedWorkspaceId,
      ),
    [companies, selectedWorkspaceId],
  );
  const activeCompanies = workspaceCompanies.filter(
    (company) => company.status === "active",
  ).length;

  useEffect(() => {
    if (!workspaces.some((workspace) => workspace.id === activeWorkspaceId))
      return;
    setSelectedWorkspaceId(activeWorkspaceId);
  }, [activeWorkspaceId, workspaces]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const localWorkspaces = readLocalWorkspaces();
      setWorkspaces(localWorkspaces);
      setCompanies(readLocalCompanies());
      setSelectedWorkspaceId((current) => {
        const active = readActiveWorkspaceId();
        return localWorkspaces.some((workspace) => workspace.id === active)
          ? active
          : current || localWorkspaces[0]?.id || "";
      });
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localMode) return;

    const syncLocalData = () => {
      const localWorkspaces = readLocalWorkspaces();
      setWorkspaces(localWorkspaces);
      setCompanies(readLocalCompanies());
      setSelectedWorkspaceId((current) => {
        const active = readActiveWorkspaceId();
        return localWorkspaces.some((workspace) => workspace.id === active)
          ? active
          : current || localWorkspaces[0]?.id || "";
      });
    };

    window.addEventListener("pierphish:workspaces-changed", syncLocalData);
    window.addEventListener("pierphish:workspace-selected", syncLocalData);
    return () => {
      window.removeEventListener("pierphish:workspaces-changed", syncLocalData);
      window.removeEventListener("pierphish:workspace-selected", syncLocalData);
    };
  }, [localMode]);

  useEffect(() => {
    if (!isSupabaseConfigured || !ready || !user || !supabase) {
      setActiveWorkspaceRole(null);
      setAccessLoading(false);
      return;
    }

    let cancelled = false;
    setAccessLoading(true);
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        if (!cancelled) {
          setActiveWorkspaceRole(null);
          setAccessLoading(false);
        }
        return;
      }

      const response = await fetch("/api/workspaces", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json().catch(() => ({}))) as {
        workspaces?: Array<{ id: string; role?: WorkspaceRole }>;
      };
      if (cancelled) return;
      const activeWorkspace = (body.workspaces ?? []).find(
        (workspace) => workspace.id === activeWorkspaceId,
      );
      setActiveWorkspaceRole(activeWorkspace?.role ?? null);
      setAccessLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setActiveWorkspaceRole(null);
        setAccessLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, ready, user?.id]);

  useEffect(() => {
    if (isSupabaseConfigured && adminAccess && ready) void loadData();
    // A sessão precisa estar pronta antes de consultar a rota protegida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAccess, ready]);

  async function getAccessToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError(
        "Sua sessão expirou. Entre novamente para administrar empresas.",
      );
      setLoading(false);
      return;
    }
    const response = await fetch("/api/admin/companies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as {
      workspaces?: WorkspaceRecord[];
      companies?: CompanyRecord[];
      error?: string;
    };
    if (!response.ok) {
      if (response.status === 503) {
        const localWorkspaces = readLocalWorkspaces();
        setWorkspaces(localWorkspaces);
        setCompanies(readLocalCompanies());
        setLocalMode(true);
        setSelectedWorkspaceId((current) => {
          const active = readActiveWorkspaceId();
          return localWorkspaces.some((workspace) => workspace.id === active)
            ? active
            : current || localWorkspaces[0]?.id || "";
        });
        setNotice(
          "O servidor ainda não foi configurado. Os dados desta sessão ficam neste navegador.",
        );
      } else {
        setError(body.error ?? "Não foi possível carregar as empresas.");
      }
    } else {
      const nextWorkspaces = body.workspaces ?? [];
      setWorkspaces(nextWorkspaces);
      setCompanies(body.companies ?? []);
      setLocalMode(false);
      setSelectedWorkspaceId((current) => {
        const active = readActiveWorkspaceId();
        return nextWorkspaces.some((workspace) => workspace.id === active)
          ? active
          : nextWorkspaces.some((workspace) => workspace.id === current)
            ? current
            : (nextWorkspaces[0]?.id ?? "");
      });
    }
    setLoading(false);
  }

  function closeModal() {
    if (submitting) return;
    setModal(null);
    setEditingCompany(null);
    setError(null);
  }

  function openCompanyModal(company?: CompanyRecord) {
    setNotice(null);
    setError(null);
    if (company) {
      setEditingCompany(company);
      setCompanyDraft({
        workspaceId: company.workspaceId,
        name: company.name,
        description: company.description,
        clientId: company.clientId,
        clientSecret: "",
        logoUrl: company.logoUrl,
        status: company.status,
      });
    } else {
      setEditingCompany(null);
      setCompanyDraft({ ...emptyCompany, workspaceId: selectedWorkspaceId });
    }
    setModal("company");
  }

  function persistDemo(
    nextWorkspaces: WorkspaceRecord[],
    nextCompanies: CompanyRecord[],
  ) {
    setWorkspaces(nextWorkspaces);
    setCompanies(nextCompanies);
    writeLocalWorkspaces(nextWorkspaces);
    writeLocalCompanies(nextCompanies);
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const name = companyDraft.name.trim();
    const clientId = companyDraft.clientId.trim();
    const clientSecret = companyDraft.clientSecret.trim();
    if (name.length < 2 || !companyDraft.workspaceId) {
      setError("Informe o nome e escolha um workspace.");
      setSubmitting(false);
      return;
    }
    if (clientId.length < 2) {
      setError("Informe um Client ID válido.");
      setSubmitting(false);
      return;
    }
    if (!editingCompany && clientSecret.length < 8) {
      setError("Informe um Client Secret com pelo menos 8 caracteres.");
      setSubmitting(false);
      return;
    }
    if (editingCompany && clientSecret && clientSecret.length < 8) {
      setError("O novo Client Secret precisa ter pelo menos 8 caracteres.");
      setSubmitting(false);
      return;
    }

    if (!isSupabaseConfigured || localMode) {
      const nextCompany: CompanyRecord = {
        id: editingCompany?.id ?? `company-${Date.now()}`,
        workspaceId: companyDraft.workspaceId,
        name,
        description: companyDraft.description.trim(),
        clientId,
        clientSecretLast4:
          clientSecret.slice(-4) || editingCompany?.clientSecretLast4 || "",
        hasClientSecret:
          Boolean(clientSecret) || Boolean(editingCompany?.hasClientSecret),
        logoUrl: companyDraft.logoUrl,
        status: companyDraft.status,
        createdAt: editingCompany?.createdAt ?? new Date().toISOString(),
      };
      const nextCompanies = editingCompany
        ? companies.map((company) =>
            company.id === editingCompany.id ? nextCompany : company,
          )
        : [...companies, nextCompany];
      persistDemo(workspaces, nextCompanies);
      setSelectedWorkspaceId(companyDraft.workspaceId);
      setModal(null);
      setEditingCompany(null);
      setCompanyDraft(emptyCompany);
      setNotice(
        editingCompany
          ? "Cliente atualizado localmente."
          : "Cliente adicionado localmente.",
      );
      setSubmitting(false);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sua sessão expirou. Entre novamente para salvar o cliente.");
      setSubmitting(false);
      return;
    }
    const method = editingCompany ? "PATCH" : "POST";
    const bodyPayload = editingCompany
      ? {
          type: "company",
          id: editingCompany.id,
          ...companyDraft,
          name,
          clientId,
          ...(clientSecret ? { clientSecret } : {}),
        }
      : { type: "company", ...companyDraft, name, clientId, clientSecret };
    const response = await fetch("/api/admin/companies", {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
    const responseBody = (await response.json().catch(() => ({}))) as {
      company?: CompanyRecord;
      error?: string;
    };
    if (!response.ok || !responseBody.company) {
      setError(responseBody.error ?? "Não foi possível salvar o cliente.");
      setSubmitting(false);
      return;
    }
    const savedCompany = responseBody.company;
    setCompanies((current) =>
      editingCompany
        ? current.map((company) =>
            company.id === savedCompany.id ? savedCompany : company,
          )
        : [...current, savedCompany],
    );
    setSelectedWorkspaceId(savedCompany.workspaceId);
    setModal(null);
    setEditingCompany(null);
    setCompanyDraft(emptyCompany);
    setNotice(editingCompany ? "Cliente atualizado." : "Cliente adicionado.");
    setSubmitting(false);
  }

  function handleModalKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeModal();
  }

  return (
    <DashboardShell activeSection="companies" title="Empresas">
      <div className="companies-page">
        <header className="surface-card companies-header">
          <div>
            <span className="companies-overline">
              PIERPHISH / CLIENTES BEEPHISH
            </span>
            <h1>Empresas para campanhas.</h1>
            <p>Gerencie as conexões BeePhish deste workspace.</p>
          </div>
          <div className="companies-header-actions">
            <span className="companies-security-note">
              <Icon name="shield" size={15} />
              Credenciais protegidas
            </span>
          </div>
        </header>

        {error && !modal && (
          <div className="companies-feedback is-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Fechar
            </button>
          </div>
        )}
        {notice && !modal && (
          <div className="companies-feedback is-success" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)}>
              Fechar
            </button>
          </div>
        )}

        {accessLoading ? (
          <section className="surface-card companies-loading" role="status">
            Verificando o acesso ao workspace…
          </section>
        ) : !adminAccess ? (
          <section
            className="surface-card companies-access-denied"
            role="alert"
          >
            Esta área é reservada para administradores.
          </section>
        ) : loading ? (
          <section className="surface-card companies-loading" role="status">
            Carregando workspaces e empresas…
          </section>
        ) : (
          <>
            {selectedWorkspace ? (
              <>
                <section className="surface-card companies-workspace-hero">
                  <div className="companies-workspace-identity">
                    <LogoPreview
                      logoUrl={selectedWorkspace.logoUrl}
                      fallback={getInitial(selectedWorkspace.name)}
                      size="lg"
                    />
                    <div>
                      <span
                        className={`companies-environment-badge ${selectedWorkspace.environment}`}
                      >
                        <i /> {environmentLabel(selectedWorkspace.environment)}
                      </span>
                      <h2>{selectedWorkspace.name}</h2>
                      <p>
                        {selectedWorkspace.description ||
                          "Sem descrição adicionada."}
                      </p>
                    </div>
                  </div>
                  <div className="companies-workspace-stats">
                    <div>
                      <strong>{workspaceCompanies.length}</strong>
                      <span>clientes</span>
                    </div>
                    <div>
                      <strong>{activeCompanies}</strong>
                      <span>ativos</span>
                    </div>
                    <div>
                      <strong>{formatDate(selectedWorkspace.createdAt)}</strong>
                      <span>criado em</span>
                    </div>
                  </div>
                </section>

                <section className="surface-card companies-client-section">
                  <div className="companies-section-head">
                    <div>
                      <span className="companies-overline">
                        CLIENTES BEEPHISH
                      </span>
                      <h2>Conexões deste ambiente.</h2>
                    </div>
                    <button
                      className="companies-secondary-button"
                      type="button"
                      onClick={() => openCompanyModal()}
                    >
                      <Icon name="arrow" size={15} />
                      Adicionar cliente
                    </button>
                  </div>
                  {workspaceCompanies.length ? (
                    <div className="companies-client-grid">
                      {workspaceCompanies.map((company) => (
                        <article
                          className="companies-client-card"
                          key={company.id}
                        >
                          <div className="companies-client-card-top">
                            <LogoPreview
                              logoUrl={company.logoUrl}
                              fallback={getInitial(company.name)}
                            />
                            <span
                              className={`companies-status-dot ${company.status}`}
                            >
                              <i />{" "}
                              {company.status === "active"
                                ? "Ativo"
                                : "Pausado"}
                            </span>
                          </div>
                          <h3>{company.name}</h3>
                          <p>
                            {company.description ||
                              "Sem informações adicionais."}
                          </p>
                          <div className="companies-client-credentials">
                            <span>Client ID</span>
                            <strong>{company.clientId}</strong>
                            <span>Client Secret</span>
                            <strong>
                              •••• ••••{" "}
                              {company.clientSecretLast4 || "não definido"}
                            </strong>
                          </div>
                          <div className="companies-client-footer">
                            <small>
                              Adicionado {formatDate(company.createdAt)}
                            </small>
                            <button
                              type="button"
                              onClick={() => openCompanyModal(company)}
                            >
                              Editar <Icon name="arrow" size={14} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="companies-empty-state">
                      <span className="companies-empty-icon">
                        <Icon name="shield" size={20} />
                      </span>
                      <strong>Nenhuma conexão neste workspace.</strong>
                      <span>
                        Adicione um cliente com Client ID e Client Secret para
                        começar.
                      </span>
                      <button
                        className="companies-primary-button"
                        type="button"
                        onClick={() => openCompanyModal()}
                      >
                        Adicionar primeiro cliente{" "}
                        <Icon name="arrow" size={15} />
                      </button>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="surface-card companies-empty-state companies-empty-workspace-state">
                <span className="companies-empty-icon">
                  <Icon name="grid" size={20} />
                </span>
                <strong>Nenhum workspace cadastrado.</strong>
                <span>
                  Crie um ambiente pelo menu do workspace no seu perfil para
                  começar a adicionar clientes.
                </span>
              </section>
            )}
          </>
        )}
      </div>

      {modal === "company" && (
        <div
          className="companies-modal-backdrop"
          role="presentation"
          onKeyDown={handleModalKeyDown}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form
            className="companies-modal companies-company-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-heading"
            onSubmit={(event) => void submitCompany(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="companies-modal-head">
              <div>
                <span className="companies-overline">CONEXÃO BEEPHISH</span>
                <h2 id="company-modal-heading">
                  {editingCompany ? "Editar cliente." : "Adicionar cliente."}
                </h2>
                <p>
                  Os dados de acesso são usados somente pela conexão
                  server-side.
                </p>
              </div>
              <button
                className="companies-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Fechar"
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="companies-modal-company-layout">
              <div className="companies-modal-fields">
                <label>
                  Workspace
                  <select
                    value={companyDraft.workspaceId}
                    onChange={(event) =>
                      setCompanyDraft((current) => ({
                        ...current,
                        workspaceId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Escolha um workspace</option>
                    {workspaces.map((workspace) => (
                      <option value={workspace.id} key={workspace.id}>
                        {workspace.name} ·{" "}
                        {environmentLabel(workspace.environment)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="companies-two-fields">
                  <label>
                    Nome do cliente
                    <input
                      value={companyDraft.name}
                      onChange={(event) =>
                        setCompanyDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ex.: Cliente 1"
                      maxLength={80}
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={companyDraft.status}
                      onChange={(event) =>
                        setCompanyDraft((current) => ({
                          ...current,
                          status: event.target.value as "active" | "inactive",
                        }))
                      }
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Pausado</option>
                    </select>
                  </label>
                </div>
                <label>
                  Informações
                  <textarea
                    value={companyDraft.description}
                    onChange={(event) =>
                      setCompanyDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Área, responsável ou observações"
                    maxLength={240}
                    rows={3}
                  />
                </label>
                <div className="companies-credential-block">
                  <div>
                    <span>Credenciais da API</span>
                    <small>
                      O Client Secret nunca é exibido depois de salvo.
                    </small>
                  </div>
                  <label>
                    Client ID
                    <input
                      value={companyDraft.clientId}
                      onChange={(event) =>
                        setCompanyDraft((current) => ({
                          ...current,
                          clientId: event.target.value,
                        }))
                      }
                      placeholder="client_id"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    Client Secret{" "}
                    {editingCompany && <small>(deixe vazio para manter)</small>}
                    <input
                      value={companyDraft.clientSecret}
                      onChange={(event) =>
                        setCompanyDraft((current) => ({
                          ...current,
                          clientSecret: event.target.value,
                        }))
                      }
                      placeholder={
                        editingCompany ? "••••••••••••" : "client_secret"
                      }
                      type="password"
                      autoComplete="new-password"
                      required={!editingCompany}
                    />
                  </label>
                </div>
              </div>
              <LogoUpload
                logoUrl={companyDraft.logoUrl}
                fallback={getInitial(companyDraft.name)}
                onChange={(logoUrl) =>
                  setCompanyDraft((current) => ({ ...current, logoUrl }))
                }
              />
            </div>
            {(error || notice) && (
              <p
                className={`companies-modal-feedback ${error ? "is-error" : "is-success"}`}
                role={error ? "alert" : "status"}
              >
                {error ?? notice}
              </p>
            )}
            <div className="companies-modal-footer">
              <button
                className="companies-cancel-button"
                type="button"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                className="companies-primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Salvando…"
                  : editingCompany
                    ? "Salvar alterações"
                    : "Adicionar cliente"}{" "}
                <Icon name="arrow" size={15} />
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}

export function CompanyManagementPage() {
  return (
    <AuthGuard>
      <CompanyManagementContent />
    </AuthGuard>
  );
}
