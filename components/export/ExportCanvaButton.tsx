"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_EXPORT_CAMPAIGNS, type ExportRequest } from "@/lib/export/types";
import type {
  CampaignExportSummary,
  CampaignExportTotals,
} from "@/lib/export/types";
import {
  fillCanvaTemplate,
  inspectCanvaTemplate,
  MAX_CANVA_TEMPLATE_BYTES,
  type CanvaTemplateScan,
} from "@/lib/export/canva-template";
import { toast } from "sonner";

type ExportCanvaButtonProps = {
  workspaceId: string;
  companyName: string;
  periodLabel: string;
  campaignCount: number;
  request: ExportRequest;
  campaigns: CampaignExportSummary[];
  totals: CampaignExportTotals;
};

function fallbackFilename(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "relatorio-de-campanhas"}.pptx`;
}

export function ExportCanvaButton({
  workspaceId,
  companyName,
  periodLabel,
  campaignCount,
  request: exportRequest,
  campaigns,
  totals,
}: ExportCanvaButtonProps) {
  const { session, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateScan, setTemplateScan] = useState<CanvaTemplateScan | null>(
    null,
  );
  const [templateError, setTemplateError] = useState("");
  const [checkingTemplate, setCheckingTemplate] = useState(false);
  const [draggingTemplate, setDraggingTemplate] = useState(false);
  const exceedsCampaignLimit = campaignCount > MAX_EXPORT_CAMPAIGNS;

  async function selectTemplate(file: File | undefined) {
    if (!file) return;
    setTemplateError("");
    setTemplateScan(null);
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setTemplateFile(null);
      setTemplateError("Escolha um arquivo .pptx exportado do Canva.");
      return;
    }
    if (file.size === 0 || file.size > MAX_CANVA_TEMPLATE_BYTES) {
      setTemplateFile(null);
      setTemplateError("O arquivo precisa ter até 20 MB.");
      return;
    }

    setTemplateFile(file);
    setCheckingTemplate(true);
    try {
      const scan = await inspectCanvaTemplate(file, {
        companyName,
        periodLabel,
        campaigns,
        totals,
      });
      setTemplateScan(scan);
    } catch (error) {
      setTemplateFile(null);
      setTemplateError(
        error instanceof Error
          ? error.message
          : "Não foi possível ler esse arquivo PowerPoint.",
      );
    } finally {
      setCheckingTemplate(false);
    }
  }

  function handleTemplateInput(event: ChangeEvent<HTMLInputElement>) {
    void selectTemplate(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleTemplateDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingTemplate(false);
    if (checkingTemplate) return;
    void selectTemplate(event.dataTransfer.files[0]);
  }

  function clearTemplate() {
    setTemplateFile(null);
    setTemplateScan(null);
    setTemplateError("");
  }

  async function downloadPowerPoint() {
    if (!session?.access_token || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/export/pptx", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId, request: exportRequest }),
      });

      if (!response.ok) {
        let message = "Não foi possível gerar o arquivo PowerPoint.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Mantém a mensagem curta quando o servidor não retorna JSON.
        }
        throw new Error(message);
      }

      const file = await response.blob();
      if (!file.size) throw new Error("O arquivo gerado está vazio.");
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fallbackFilename(exportRequest.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Arquivo pronto para importar no Canva.");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o arquivo PowerPoint.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadCanvaTemplate() {
    if (!templateFile || !templateScan?.recognized.length || loading) return;
    if (exceedsCampaignLimit) {
      toast.error(
        `O limite é de ${MAX_EXPORT_CAMPAIGNS} campanhas por arquivo.`,
      );
      return;
    }
    setLoading(true);
    try {
      const result = await fillCanvaTemplate(templateFile, {
        companyName,
        periodLabel,
        campaigns,
        totals,
      });
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fallbackFilename(
        `${templateFile.name.replace(/\.pptx$/i, "")}-PierSec`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success(`${result.replaced} campo(s) preenchido(s) no modelo.`);
      if (result.unrecognized.length > 0) {
        toast.warning(
          `${result.unrecognized.length} marcador(es) sem correspondência foram mantidos no arquivo.`,
        );
      }
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível preencher o modelo.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (user?.email?.trim().toLowerCase() !== "gabriel.goes@piersec.com.br")
    return null;

  return (
    <>
      <button
        type="button"
        className="dashboard-export-button"
        aria-label="Exportar para o Canva"
        onClick={() => setOpen(true)}
        disabled={!session?.access_token}
        title={
          session?.access_token
            ? "Exportar o resumo atual em PowerPoint"
            : "Entre no PierSec para exportar"
        }
      >
        Exportar para o{" "}
        <span className="canva-logo" role="img" aria-label="Canva" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="export-canva-dialog" showCloseButton={false}>
          <DialogHeader className="export-canva-header">
            <DialogTitle>Exportar relatório</DialogTitle>
            <DialogDescription>
              Baixe uma apresentação com o resumo que está aplicado no painel.
            </DialogDescription>
          </DialogHeader>

          <dl className="export-canva-summary">
            <div>
              <dt>Empresa</dt>
              <dd>{companyName}</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{periodLabel}</dd>
            </div>
            <div>
              <dt>Campanhas</dt>
              <dd>{campaignCount}</dd>
            </div>
          </dl>

          <section className="export-canva-option" aria-label="Modelo do Canva">
            <p className="export-canva-option-label">Modelo do Canva</p>
            <p className="export-canva-option-description">
              Solte aqui um .pptx exportado do Canva. O PierSec troca os
              marcadores pelos dados do painel; o arquivo é processado neste
              navegador.
            </p>
            <div
              className={`export-canva-dropzone${draggingTemplate ? "is-dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDraggingTemplate(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setDraggingTemplate(false);
                }
              }}
              onDrop={handleTemplateDrop}
            >
              <input
                id="export-canva-template"
                className="export-canva-file-input"
                type="file"
                disabled={checkingTemplate}
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleTemplateInput}
                aria-label="Escolher modelo PowerPoint do Canva"
              />
              <label htmlFor="export-canva-template">
                {templateFile
                  ? "Trocar arquivo .pptx"
                  : "Escolher arquivo .pptx"}
              </label>
              <span>ou solte o arquivo nesta área · até 20 MB</span>
            </div>
            {templateFile && (
              <div className="export-canva-template-file">
                <span title={templateFile.name}>{templateFile.name}</span>
                <button type="button" onClick={clearTemplate}>
                  Remover
                </button>
              </div>
            )}
            {checkingTemplate && (
              <p className="export-canva-help">Lendo os campos do modelo…</p>
            )}
            {templateError && (
              <p className="export-canva-error" role="alert">
                {templateError}
              </p>
            )}
            {templateScan && (
              <div className="export-canva-template-scan" aria-live="polite">
                <p>
                  {templateScan.slides} slides ·{" "}
                  {templateScan.recognized.length} campo(s) PierSec
                  encontrado(s)
                </p>
                {templateScan.recognized.length > 0 && (
                  <p>
                    Campos:{" "}
                    {templateScan.recognized
                      .slice(0, 5)
                      .map((name) => `{{${name}}}`)
                      .join(", ")}
                    {templateScan.recognized.length > 5 ? ", …" : ""}
                  </p>
                )}
                {templateScan.recognized.length === 0 ? (
                  <p className="export-canva-error">
                    Nenhum marcador reconhecido. Adicione campos como{" "}
                    <code>{"{{empresa}}"}</code> no Canva e exporte o modelo
                    novamente.
                  </p>
                ) : (
                  <p className="export-canva-help">
                    {templateScan.unrecognized.length > 0
                      ? `${templateScan.unrecognized.length} marcador(es) desconhecido(s) ficarão sem alteração.`
                      : "Todos os marcadores encontrados serão preenchidos."}
                  </p>
                )}
              </div>
            )}
            <details className="export-canva-fields">
              <summary>Campos que você pode inserir no Canva</summary>
              <p>
                Dados gerais: <code>{"{{empresa}}"}</code>,{" "}
                <code>{"{{periodo}}"}</code>, <code>{"{{campanhas}}"}</code>,{" "}
                <code>{"{{participantes}}"}</code>,{" "}
                <code>{"{{enviados}}"}</code>, <code>{"{{entregues}}"}</code>,{" "}
                <code>{"{{aberturas}}"}</code>,{" "}
                <code>{"{{taxa_abertura}}"}</code>, <code>{"{{cliques}}"}</code>
                , <code>{"{{taxa_cliques}}"}</code> e{" "}
                <code>{"{{reportes}}"}</code>.
              </p>
              <p>
                Para cada campanha, use por exemplo{" "}
                <code>{"{{campanha_1_nome}}"}</code>,{" "}
                <code>{"{{campanha_1_cliques}}"}</code> ou{" "}
                <code>{"{{campanha_1_taxa_abertura}}"}</code>. Troque o número{" "}
                para escolher outra campanha, até 250.
              </p>
              <p>
                Digite cada marcador como um único trecho de texto no Canva. O
                PierSec mantém fontes, cores, imagens e posicionamento do
                modelo. Textos mais longos podem mudar as quebras de linha.
              </p>
            </details>
            <button
              type="button"
              className="export-canva-download"
              onClick={() => void downloadCanvaTemplate()}
              disabled={
                loading ||
                checkingTemplate ||
                !templateFile ||
                !templateScan?.recognized.length ||
                exceedsCampaignLimit ||
                !session?.access_token
              }
            >
              {loading
                ? "Preenchendo modelo…"
                : exceedsCampaignLimit
                  ? "Limite de 250 campanhas"
                  : "Preencher e baixar modelo"}
            </button>
            {exceedsCampaignLimit && (
              <p className="export-canva-help">
                Cada arquivo pode incluir até {MAX_EXPORT_CAMPAIGNS} campanhas.
                Ajuste os filtros para continuar.
              </p>
            )}
          </section>

          <section className="export-canva-option" aria-label="Modelo PierSec">
            <p className="export-canva-option-label">Usar o modelo padrão</p>
            <p className="export-canva-option-description">
              Gere uma apresentação pronta com o layout padrão do PierSec.
            </p>
            <button
              type="button"
              className="export-canva-download export-canva-download-secondary"
              onClick={() => void downloadPowerPoint()}
              disabled={
                loading || exceedsCampaignLimit || !session?.access_token
              }
            >
              {loading ? "Gerando arquivo…" : "Baixar modelo padrão"}
            </button>
            <p className="export-canva-help">
              O arquivo também pode ser importado no Canva ou aberto no
              PowerPoint.
            </p>
          </section>

          {!session?.access_token && (
            <p className="export-canva-help">
              Entre no PierSec para gerar o arquivo.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
