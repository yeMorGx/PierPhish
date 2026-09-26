"use client";

import {
  ArrowRight,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type EmailSampleAttachment = {
  contentType: string;
  inline: boolean;
  name: string;
  size: number;
};

type EmailSample = {
  id: string;
  originalFileName: string;
  fileExtension: "eml" | "msg";
  mimeType: string;
  sizeBytes: number;
  subject: string | null;
  fromAddress: string | null;
  toAddresses: string[];
  sentAt: string | null;
  parsedHtml: string;
  parsedText: string;
  attachments: EmailSampleAttachment[];
  createdAt: string;
  updatedAt: string;
};

type StorageUsage = {
  usedBytes: number;
  maxBytes: number;
  remainingBytes: number;
  usedPercentage: number;
};

type SampleLimits = {
  maxFileSizeBytes: number;
  maxStorageBytes: number;
};

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const emailPreviewStyles = `
  :root { color-scheme: light; }
  html { background: #ffffff; }
  body {
    box-sizing: border-box;
    min-width: 0;
    margin: 0;
    padding: 24px;
    overflow-wrap: anywhere;
    color: #273238;
    background: #ffffff;
    font: 14px/1.6 Arial, Helvetica, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  td, th { overflow-wrap: anywhere; }
  a { color: #356778; }
  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
  }
`;

function buildEmailPreviewDocument(html: string) {
  const styleTag = `<style data-pierphish-email-preview>${emailPreviewStyles}</style>`;

  if (/<html[\s>]/i.test(html)) {
    if (/<head[\s>]/i.test(html)) {
      return html.replace(/(<head[^>]*>)/i, `$1${styleTag}`);
    }

    return html.replace(/(<html[^>]*>)/i, `$1<head>${styleTag}</head>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styleTag}</head><body>${html}</body></html>`;
}

async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function EmailSampleCard({
  campaignId,
  className,
}: {
  campaignId: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sample, setSample] = useState<EmailSample | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [limits, setLimits] = useState<SampleLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadSample() {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const token = await accessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/email-sample`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = (await response.json()) as {
        error?: string;
        sample?: EmailSample | null;
        storage?: StorageUsage;
        limits?: SampleLimits;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Não foi possível carregar o exemplo.");
      setSample(body.sample ?? null);
      setStorage(body.storage ?? null);
      setLimits(body.limits ?? null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o exemplo.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSample();
    // The campaign id is the only server resource this card owns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function chooseFile() {
    inputRef.current?.click();
  }

  async function uploadFile(file: File) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "eml" && extension !== "msg") {
      toast.error("Escolha um arquivo .eml ou .msg.");
      return;
    }
    const maxBytes = limits?.maxFileSizeBytes ?? 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        `Este arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`,
      );
      return;
    }
    const token = await accessToken();
    if (!token) {
      toast.error("Sua sessão expirou. Entre novamente para anexar o arquivo.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    const method = sample ? "PUT" : "POST";

    await new Promise<void>((resolve) => {
      const request = new XMLHttpRequest();
      request.open(method, `/api/campaigns/${campaignId}/email-sample`);
      request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      request.onload = () => {
        void (async () => {
          let body: {
            error?: string;
            sample?: EmailSample;
            storage?: StorageUsage;
          } = {};
          try {
            body = JSON.parse(request.responseText) as typeof body;
          } catch {
            // The status below still provides a useful fallback message.
          }
          if (request.status < 200 || request.status >= 300) {
            toast.error(
              body.error ??
                `Não foi possível anexar o arquivo (HTTP ${request.status}).`,
            );
          } else {
            setSample(body.sample ?? null);
            setStorage(body.storage ?? null);
            toast.success(
              sample
                ? "Exemplo do e-mail substituído com sucesso."
                : "Exemplo do e-mail enviado com sucesso.",
            );
          }
          resolve();
        })();
      };
      request.onerror = () => {
        toast.error(
          "Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.",
        );
        resolve();
      };
      request.send(formData);
    });
    setUploading(false);
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await uploadFile(file);
  }

  async function getSignedUrl(mode: "preview" | "download") {
    const token = await accessToken();
    if (!token) throw new Error("Sua sessão expirou.");
    const response = await fetch(
      `/api/campaigns/${campaignId}/email-sample?mode=${mode}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await response.json()) as {
      error?: string;
      signedUrl?: string;
    };
    if (!response.ok || !body.signedUrl) {
      throw new Error(
        body.error ?? "Não foi possível gerar o acesso temporário.",
      );
    }
    return body.signedUrl;
  }

  async function downloadOriginal() {
    try {
      const signedUrl = await getSignedUrl("download");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível baixar o original.",
      );
    }
  }

  async function removeSample() {
    if (!window.confirm("Remover o exemplo do e-mail desta campanha?")) return;
    const token = await accessToken();
    if (!token) {
      toast.error("Sua sessão expirou.");
      return;
    }
    const response = await fetch(`/api/campaigns/${campaignId}/email-sample`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as {
      error?: string;
      storage?: StorageUsage;
    };
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível remover o exemplo.");
      return;
    }
    setSample(null);
    setStorage(body.storage ?? null);
    setModalOpen(false);
    toast.success("Exemplo do e-mail removido.");
  }

  const triggerWrapClassName = ["email-sample-trigger-wrap", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={triggerWrapClassName}>
        <input
          ref={inputRef}
          accept=".eml,.msg,message/rfc822,application/vnd.ms-outlook"
          className="sr-only"
          type="file"
          onChange={(event) => void handleFileChange(event)}
        />
        <button
          className="email-sample-trigger"
          data-tour="campaign-evidence"
          type="button"
          aria-busy={loading}
          aria-haspopup="dialog"
          disabled={loading}
          onClick={() => setModalOpen(true)}
        >
          <span className="email-sample-trigger-icon">
            {loading ? (
              <RefreshCw
                className="animate-spin"
                aria-hidden="true"
                size={16}
              />
            ) : (
              <FileText aria-hidden="true" size={17} strokeWidth={1.7} />
            )}
          </span>
          <span className="email-sample-trigger-copy">
            <strong>Exemplo do e-mail</strong>
            <small>
              {loading
                ? "Carregando…"
                : sample
                  ? `${sample.originalFileName} · ${formatBytes(sample.sizeBytes)}`
                  : "Nenhum exemplo anexado"}
            </small>
          </span>
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>

      <EmailSamplePreviewModal
        sample={sample}
        storage={storage}
        uploading={uploading}
        uploadProgress={uploadProgress}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDownload={() => void downloadOriginal()}
        onReplace={chooseFile}
        onRemove={() => void removeSample()}
      />
    </>
  );
}

function EmailSamplePreviewModal({
  sample,
  storage,
  uploading,
  uploadProgress,
  open,
  onClose,
  onDownload,
  onReplace,
  onRemove,
}: {
  sample: EmailSample | null;
  storage: StorageUsage | null;
  uploading: boolean;
  uploadProgress: number;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], iframe, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="email-sample-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="email-sample-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-sample-modal-title"
        aria-describedby="email-sample-modal-description"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="email-sample-modal-head">
          <div>
            <span className="email-sample-overline">PRÉVIA SEGURA</span>
            <h2 id="email-sample-modal-title">Exemplo do e-mail</h2>
            <p id="email-sample-modal-description">
              {sample
                ? `${sample.originalFileName} · .${sample.fileExtension.toUpperCase()} · ${formatBytes(sample.sizeBytes)}`
                : "Anexe um arquivo .eml ou .msg para consultar a mensagem original."}
            </p>
          </div>
          <span className="email-sample-storage-badge">
            <HardDrive aria-hidden="true" size={15} strokeWidth={1.6} />
            {storage
              ? `${formatBytes(storage.usedBytes)} de ${formatBytes(storage.maxBytes)} utilizados`
              : "Armazenamento privado do workspace"}
          </span>
          <button type="button" aria-label="Fechar prévia" onClick={onClose}>
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <div className="email-sample-modal-body">
          {uploading && (
            <div className="email-sample-upload-progress" aria-live="polite">
              <div>
                <span>Enviando arquivo…</span>
                <strong>{uploadProgress}%</strong>
              </div>
              <span>
                <i style={{ width: `${uploadProgress}%` }} />
              </span>
            </div>
          )}

          {sample ? (
            <>
              <div className="email-sample-meta-grid">
                <div>
                  <span>Assunto</span>
                  <strong>{sample.subject || "—"}</strong>
                </div>
                <div>
                  <span>Remetente</span>
                  <strong>{sample.fromAddress || "—"}</strong>
                </div>
                <div>
                  <span>Destinatários</span>
                  <strong>{sample.toAddresses.join(", ") || "—"}</strong>
                </div>
                <div>
                  <span>Data do envio</span>
                  <strong>{formatDate(sample.sentAt)}</strong>
                </div>
              </div>

              <div className="email-sample-preview-grid">
                <section className="email-sample-rendered-preview">
                  <span className="email-sample-section-label">
                    HTML SANITIZADO
                  </span>
                  {sample.parsedHtml ? (
                    <iframe
                      className="email-sample-iframe"
                      sandbox=""
                      srcDoc={buildEmailPreviewDocument(sample.parsedHtml)}
                      title="Conteúdo HTML sanitizado do e-mail"
                    />
                  ) : (
                    <pre>
                      {sample.parsedText || "Sem conteúdo de mensagem."}
                    </pre>
                  )}
                </section>
                <section className="email-sample-plain-preview">
                  <span className="email-sample-section-label">TEXTO PURO</span>
                  <pre>{sample.parsedText || "Sem texto puro disponível."}</pre>
                </section>
              </div>

              <section className="email-sample-attachments">
                <span className="email-sample-section-label">ANEXOS</span>
                {sample.attachments.length ? (
                  sample.attachments.map((attachment) => (
                    <div key={`${attachment.name}-${attachment.size}`}>
                      <FileText aria-hidden="true" size={15} />
                      <span>{attachment.name}</span>
                      <small>
                        {formatBytes(attachment.size)}
                        {attachment.inline ? " · incorporado" : ""}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>Nenhum anexo encontrado.</p>
                )}
              </section>
            </>
          ) : (
            <div className="email-sample-drawer-empty">
              <div className="email-sample-empty-icon">
                <Upload aria-hidden="true" size={23} strokeWidth={1.5} />
              </div>
              <strong>Nenhum exemplo anexado</strong>
              <p>
                Adicione o arquivo original exportado da caixa de entrada para
                consultar o HTML sanitizado, o texto puro e os anexos.
              </p>
              <button
                className="is-primary"
                type="button"
                onClick={onReplace}
                disabled={uploading}
              >
                <Upload aria-hidden="true" size={14} />
                Adicionar exemplo do e-mail
              </button>
            </div>
          )}
        </div>

        <footer className="email-sample-modal-footer">
          {sample ? (
            <>
              <button className="is-danger" type="button" onClick={onRemove}>
                <Trash2 aria-hidden="true" size={14} /> Remover exemplo
              </button>
              <div>
                <button type="button" onClick={onReplace} disabled={uploading}>
                  <Upload aria-hidden="true" size={14} /> Substituir arquivo
                </button>
                <button
                  className="is-primary"
                  type="button"
                  onClick={onDownload}
                >
                  <Download aria-hidden="true" size={14} /> Baixar original
                </button>
              </div>
            </>
          ) : (
            <span>O arquivo fica disponível apenas para esta campanha.</span>
          )}
        </footer>
      </div>
    </div>
  );
}
