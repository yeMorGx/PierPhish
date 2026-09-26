"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import {
  CampaignsNavigation,
  type CampaignPageView,
} from "@/components/campaigns/campaigns-navigation";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";

type AssetType = "group" | "template" | "page" | "sending_profile";
type Recipient = {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
};
type Connector = {
  id: string;
  name: string;
  online: boolean;
  snapshot?: { commandEncryptionKey?: string };
};
type Operation = {
  id: string;
  type: string;
  name: string;
  status: string;
  result: string | null;
  assetId: number | null;
};

const meta: Record<
  AssetType,
  { title: string; listHref: string; nav: CampaignPageView; button: string }
> = {
  group: {
    title: "Novo grupo",
    listHref: "/campanhas/grupos",
    nav: "groups",
    button: "Criar grupo",
  },
  template: {
    title: "Novo modelo",
    listHref: "/campanhas/modelos",
    nav: "templates",
    button: "Salvar modelo",
  },
  page: {
    title: "Nova página de destino",
    listHref: "/campanhas/paginas",
    nav: "pages",
    button: "Salvar página",
  },
  sending_profile: {
    title: "Novo perfil de envio",
    listHref: "/campanhas/envio",
    nav: "sendingProfiles",
    button: "Salvar perfil",
  },
};

const initialRecipient = (): Recipient => ({
  email: "",
  firstName: "",
  lastName: "",
  position: "",
});
const sampleTemplateHtml =
  '<p>Olá, {{.FirstName}}.</p>\n<p>Esta é uma mensagem do exercício de conscientização.</p>\n<p><a href="{{.URL}}">Acessar material</a></p>';
const samplePageHtml =
  "<main>\n  <h1>Exercício concluído</h1>\n  <p>Esta página faz parte de uma simulação autorizada de conscientização.</p>\n  <p>Nenhuma senha ou credencial foi solicitada ou armazenada.</p>\n</main>";

function errorMessage(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function parseCsvRows(source: string) {
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseRecipientCsv(source: string) {
  const rows = parseCsvRows(source);
  if (rows.length < 2)
    throw new Error(
      "O CSV precisa ter cabeçalho e pelo menos um destinatário.",
    );
  const normalizeHeader = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_");
  const header = rows[0].map(normalizeHeader);
  const emailColumn = header.findIndex((value) =>
    ["email", "e_mail", "endereco_de_email"].includes(value),
  );
  if (emailColumn < 0)
    throw new Error("Inclua uma coluna chamada email no CSV.");
  const column = (...names: string[]) =>
    header.findIndex((value) => names.includes(value));
  const firstColumn = column("first_name", "nome", "primeiro_nome");
  const lastColumn = column("last_name", "sobrenome", "ultimo_nome");
  const positionColumn = column("position", "cargo", "funcao");
  return rows
    .slice(1)
    .map((values) => ({
      email: values[emailColumn] ?? "",
      firstName: firstColumn >= 0 ? (values[firstColumn] ?? "") : "",
      lastName: lastColumn >= 0 ? (values[lastColumn] ?? "") : "",
      position: positionColumn >= 0 ? (values[positionColumn] ?? "") : "",
    }))
    .filter((recipient) => recipient.email);
}

function terminal(status: string) {
  return ["succeeded", "failed", "uncertain", "expired"].includes(status);
}

function statusLabel(status: string) {
  if (status === "queued") return "Aguardando conexão";
  if (status === "processing") return "Criando no ambiente conectado";
  if (status === "succeeded") return "Criado";
  if (status === "uncertain") return "Confira antes de repetir";
  if (status === "expired") return "Expirou sem processamento";
  if (status === "failed") return "Não foi criado";
  return status;
}

export function CampaignAssetCreateContent({ type }: { type: AssetType }) {
  const { session } = useAuth();
  const workspaceId = useActiveWorkspaceId();
  const config = meta[type];
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [connectorId, setConnectorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [operation, setOperation] = useState<Operation | null>(null);
  const [name, setName] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([
    initialRecipient(),
  ]);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [templateHtml, setTemplateHtml] = useState(sampleTemplateHtml);
  const [pageHtml, setPageHtml] = useState(samplePageHtml);
  const [host, setHost] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const onlineConnectors = useMemo(
    () => connectors.filter((connector) => connector.online),
    [connectors],
  );
  const selectedConnector =
    onlineConnectors.find((connector) => connector.id === connectorId) ??
    onlineConnectors[0] ??
    null;

  const loadConnectors = useCallback(async () => {
    if (!session?.access_token || !isSupabaseConfigured) {
      setConnectors([]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/campaigns/connection?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          errorMessage(body, "Não foi possível carregar a conexão."),
        );
      const next = body.connectors ?? [];
      setConnectors(next);
      setConnectorId((current) =>
        next.some(
          (connector: Connector) =>
            connector.id === current && connector.online,
        )
          ? current
          : (next.find((connector: Connector) => connector.online)?.id ?? ""),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar a conexão.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, workspaceId]);

  useEffect(() => {
    void loadConnectors();
  }, [loadConnectors]);

  useEffect(() => {
    const commandId = operation?.id;
    const commandStatus = operation?.status;
    if (!commandId || terminal(commandStatus ?? "") || !session?.access_token)
      return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/campaigns/assets?workspaceId=${encodeURIComponent(workspaceId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const latest = (body.operations ?? []).find(
          (item: Operation) => item.id === commandId,
        );
        if (!latest) return;
        setOperation(latest);
        if (terminal(latest.status)) {
          if (latest.status === "succeeded")
            toast.success("Ativo criado", {
              description: "Ele já está disponível para montar uma campanha.",
            });
          else
            toast.error(statusLabel(latest.status), {
              description: latest.result ?? "Confira o histórico de atividade.",
            });
        }
      } catch {
        /* A próxima consulta atualiza o estado. */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [operation?.id, operation?.status, session?.access_token, workspaceId]);

  function updateRecipient(
    index: number,
    field: keyof Recipient,
    value: string,
  ) {
    setRecipients((current) =>
      current.map((recipient, row) =>
        row === index ? { ...recipient, [field]: value } : recipient,
      ),
    );
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("O CSV precisa ter menos de 1 MB.");
      return;
    }
    try {
      const imported = parseRecipientCsv(await file.text());
      if (imported.length > 500)
        throw new Error("Cada grupo pode ter até 500 destinatários.");
      setRecipients(imported);
      setError("");
      toast.success(`${imported.length} destinatário(s) carregado(s)`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível ler o CSV.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConnector || !session?.access_token) return;
    setSaving(true);
    setError("");
    setOperation(null);
    const payload: Record<string, unknown> = {
      workspaceId,
      connectorId: selectedConnector.id,
      type,
      name,
    };
    if (type === "group") payload.targets = recipients;
    if (type === "template")
      Object.assign(payload, {
        subject: templateSubject,
        text: templateText,
        html: templateHtml,
      });
    if (type === "page") payload.html = pageHtml;
    if (type === "sending_profile")
      Object.assign(payload, { host, fromAddress, username, password });
    try {
      const response = await fetch("/api/campaigns/assets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(errorMessage(body, "Não foi possível criar o ativo."));
      setOperation({
        id: body.commandId,
        type,
        name,
        status: body.status ?? "queued",
        result: null,
        assetId: null,
      });
      if (type === "group") setRecipients([initialRecipient()]);
      if (type === "sending_profile") {
        setPassword("");
        setUsername("");
      }
      toast.success("Pedido registrado", {
        description: "A conexão privada vai processar a criação.",
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o ativo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const targetCount = recipients.filter((recipient) =>
    recipient.email.trim(),
  ).length;
  const canSubmit =
    Boolean(selectedConnector?.snapshot?.commandEncryptionKey) &&
    !saving &&
    (type !== "group" || targetCount > 0);

  return (
    <DashboardShell
      activeSection="campaigns"
      title={config.title}
      headerAction={
        <Link
          href={config.listHref}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] px-4 text-[11px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
        >
          Voltar
        </Link>
      }
    >
      <div className="grid gap-4">
        <CampaignsNavigation current={config.nav} />
        <section className="surface-card rounded-[22px] border border-[var(--card-border)] p-6 max-[720px]:p-4">
          <div className="max-w-[720px]">
            <h2 className="m-0 text-[20px] font-semibold tracking-[-0.04em]">
              {type === "group"
                ? "Dados do público"
                : type === "template"
                  ? "Conteúdo do modelo"
                  : type === "page"
                    ? "Conteúdo da página"
                    : "Configuração de envio"}
            </h2>
            <p className="mt-2 mb-0 text-[12px] leading-relaxed text-[var(--text-muted)]">
              O PierSec envia este pedido de forma protegida pela conexão
              privada. O ambiente confirma a criação e o histórico registra
              responsável, horário e resultado.
            </p>
          </div>

          {onlineConnectors.length > 1 && (
            <label className="mt-5 grid max-w-[430px] gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
              AMBIENTE
              <select
                className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                value={selectedConnector?.id ?? ""}
                onChange={(event) => setConnectorId(event.target.value)}
              >
                {onlineConnectors.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!selectedConnector && (
            <div className="mt-5 rounded-[12px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-[12px] text-[var(--text-muted)]">
              {loading
                ? "Verificando conexão…"
                : "Conecte um ambiente para criar ativos no PierSec."}{" "}
              {!loading && (
                <Link
                  href="/campanhas/conexao"
                  className="font-bold text-[var(--ink)] underline underline-offset-4"
                >
                  Abrir conexão
                </Link>
              )}
            </div>
          )}

          {selectedConnector &&
            !selectedConnector.snapshot?.commandEncryptionKey && (
              <p
                role="alert"
                className="mt-5 rounded-[12px] border border-[#ead5d5] bg-[#fff7f7] px-4 py-3 text-[11px] text-[#8b3d3d]"
              >
                Atualize o conector para habilitar operações protegidas.
              </p>
            )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-[12px] border border-[#ead5d5] bg-[#fff7f7] px-4 py-3 text-[11px] text-[#8b3d3d]"
            >
              {error}
            </p>
          )}

          {selectedConnector && (
            <form className="mt-5 grid max-w-[960px] gap-5" onSubmit={submit}>
              <label className="grid max-w-[600px] gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                NOME
                <input
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  placeholder={
                    type === "group"
                      ? "Ex.: Equipe de teste autorizada"
                      : "Nome para identificar o ativo"
                  }
                />
              </label>

              {type === "group" && (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-[13px] font-semibold text-[var(--ink)]">
                        Destinatários · {targetCount}
                      </h3>
                      <p className="mt-1 mb-0 text-[10px] text-[var(--text-muted)]">
                        Use somente uma lista autorizada para simulação. Não
                        inclua senhas.
                      </p>
                    </div>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-[10px] border border-[var(--line)] px-3 text-[10px] font-bold text-[var(--ink)] hover:bg-[var(--surface-soft)]">
                      Importar CSV
                      <input
                        className="sr-only"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(event) => {
                          void importCsv(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <p className="m-0 text-[10px] text-[var(--text-muted)]">
                    CSV com cabeçalho <code>email,nome,sobrenome,cargo</code>;
                    também aceita ponto e vírgula.
                  </p>
                  <div className="overflow-x-auto rounded-[12px] border border-[var(--line-soft)]">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead className="bg-[var(--surface-soft)] text-[9px] font-bold text-[var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2">E-MAIL</th>
                          <th className="px-3 py-2">NOME</th>
                          <th className="px-3 py-2">SOBRENOME</th>
                          <th className="px-3 py-2">CARGO</th>
                          <th className="px-2 py-2">
                            <span className="sr-only">Remover</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line-soft)]">
                        {recipients.map((recipient, index) => (
                          <tr key={index}>
                            {(
                              [
                                "email",
                                "firstName",
                                "lastName",
                                "position",
                              ] as const
                            ).map((field) => (
                              <td key={field} className="p-2">
                                <input
                                  aria-label={
                                    field === "email"
                                      ? `E-mail ${index + 1}`
                                      : `${field} ${index + 1}`
                                  }
                                  type={field === "email" ? "email" : "text"}
                                  maxLength={field === "email" ? 320 : 120}
                                  value={recipient[field]}
                                  onChange={(event) =>
                                    updateRecipient(
                                      index,
                                      field,
                                      event.target.value,
                                    )
                                  }
                                  className="h-9 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-2 text-[11px] font-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                                  placeholder={
                                    field === "email"
                                      ? "nome@empresa.com"
                                      : field === "firstName"
                                        ? "Nome"
                                        : field === "lastName"
                                          ? "Sobrenome"
                                          : "Cargo"
                                  }
                                />
                              </td>
                            ))}
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipients((current) =>
                                    current.length > 1
                                      ? current.filter(
                                          (_, row) => row !== index,
                                        )
                                      : [initialRecipient()],
                                  )
                                }
                                aria-label={`Remover destinatário ${index + 1}`}
                                className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                              >
                                <Icon name="close" size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRecipients((current) =>
                        current.length < 500
                          ? [...current, initialRecipient()]
                          : current,
                      )
                    }
                    disabled={recipients.length >= 500}
                    className="h-9 w-fit rounded-[9px] border border-[var(--line)] px-3 text-[10px] font-bold text-[var(--ink)] disabled:opacity-50"
                  >
                    Adicionar destinatário
                  </button>
                  <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
                    Os endereços ficam cifrados somente na fila e são removidos
                    após o processamento. O ambiente conectado mantém o grupo
                    para uso em campanhas.
                  </p>
                </div>
              )}

              {type === "template" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)] md:col-span-2">
                    ASSUNTO
                    <input
                      required
                      maxLength={200}
                      value={templateSubject}
                      onChange={(event) =>
                        setTemplateSubject(event.target.value)
                      }
                      className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    TEXTO SIMPLES · OPCIONAL
                    <textarea
                      maxLength={100000}
                      rows={9}
                      value={templateText}
                      onChange={(event) => setTemplateText(event.target.value)}
                      className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 text-[12px] leading-relaxed font-normal text-[var(--ink)]"
                      placeholder="Versão em texto simples do e-mail"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    CONTEÚDO HTML
                    <textarea
                      required
                      maxLength={200000}
                      rows={9}
                      value={templateHtml}
                      onChange={(event) => setTemplateHtml(event.target.value)}
                      className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]"
                    />
                  </label>
                  <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)] md:col-span-2">
                    Variáveis disponíveis: <code>{"{{.FirstName}}"}</code>,{" "}
                    <code>{"{{.LastName}}"}</code> e <code>{"{{.URL}}"}</code>.
                    Scripts e formulários são removidos; o rastreamento de
                    abertura é incluído pelo PierSec.
                  </p>
                </div>
              )}

              {type === "page" && (
                <div className="grid gap-2">
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    CONTEÚDO HTML
                    <textarea
                      required
                      maxLength={200000}
                      rows={18}
                      value={pageHtml}
                      onChange={(event) => setPageHtml(event.target.value)}
                      className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]"
                    />
                  </label>
                  <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
                    Formulários, campos de entrada, scripts e captura de
                    credenciais são bloqueados. Crie páginas estáticas para
                    treinamento.
                  </p>
                </div>
              )}

              {type === "sending_profile" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    SERVIDOR SMTP · HOST:PORTA
                    <input
                      required
                      value={host}
                      onChange={(event) => setHost(event.target.value)}
                      className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                      placeholder="smtp.empresa.com:587"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    REMETENTE
                    <input
                      required
                      type="text"
                      value={fromAddress}
                      onChange={(event) => setFromAddress(event.target.value)}
                      className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                      placeholder="Treinamento <treinamento@empresa.com>"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    USUÁRIO SMTP · OPCIONAL
                    <input
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    SENHA SMTP · OPCIONAL
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-normal text-[var(--ink)]"
                    />
                  </label>
                  <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)] md:col-span-2">
                    A senha é cifrada para a conexão privada, não aparece no
                    histórico e é apagada da fila depois do processamento. A
                    validação de certificado permanece ativa.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
                <p className="m-0 text-[10px] text-[var(--text-muted)]">
                  Conexão: {selectedConnector.name}
                </p>
                <button
                  type="submit"
                  disabled={
                    !canSubmit ||
                    !name.trim() ||
                    (type === "group" && targetCount === 0) ||
                    (type === "template" && !templateSubject.trim()) ||
                    (type === "page" && !pageHtml.trim()) ||
                    (type === "sending_profile" &&
                      (!host.trim() ||
                        !fromAddress.trim() ||
                        Boolean(username) !== Boolean(password)))
                  }
                  className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--ink)] px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Enviando…" : config.button}
                </button>
              </div>
            </form>
          )}
        </section>

        {operation && (
          <section
            aria-live="polite"
            className="surface-card rounded-[16px] border border-[var(--card-border)] px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[13px] font-semibold text-[var(--ink)]">
                  {operation.name}
                </h2>
                <p className="mt-1 mb-0 text-[11px] text-[var(--text-muted)]">
                  {operation.result ??
                    "O PierSec consulta a conexão privada a cada 30 segundos."}
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                {statusLabel(operation.status)}
              </span>
            </div>
            {operation.status === "succeeded" && (
              <Link
                href={config.listHref}
                className="mt-3 inline-flex text-[11px] font-bold text-[var(--ink)] underline underline-offset-4"
              >
                Ver ativos disponíveis
              </Link>
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
