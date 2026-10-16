"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_EXPORT_CAMPAIGNS, type ExportRequest } from "@/lib/export/types";
import { toast } from "sonner";

type ExportCanvaButtonProps = {
  workspaceId: string;
  companyName: string;
  periodLabel: string;
  campaignCount: number;
  request: ExportRequest;
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
}: ExportCanvaButtonProps) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const exceedsCampaignLimit = campaignCount > MAX_EXPORT_CAMPAIGNS;

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

  return (
    <>
      <button
        type="button"
        className="dashboard-export-button"
        onClick={() => setOpen(true)}
        disabled={!session?.access_token}
        title={
          session?.access_token
            ? "Exportar o resumo atual em PowerPoint"
            : "Entre no PierSec para exportar"
        }
      >
        Exportar para Canva
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

          <section
            className="export-canva-option"
            aria-label="Arquivo PowerPoint"
          >
            <p className="export-canva-option-label">A · Arquivo PowerPoint</p>
            <p className="export-canva-option-description">
              Baixe o .pptx e importe-o no Canva ou abra no PowerPoint.
            </p>
            <button
              type="button"
              className="export-canva-download"
              onClick={() => void downloadPowerPoint()}
              disabled={loading || exceedsCampaignLimit}
            >
              {loading
                ? "Gerando arquivo…"
                : exceedsCampaignLimit
                  ? "Limite de 250 campanhas"
                  : "Baixar .pptx"}
            </button>
            {exceedsCampaignLimit && (
              <p className="export-canva-help">
                Cada arquivo pode incluir até {MAX_EXPORT_CAMPAIGNS} campanhas.
                Ajuste os filtros para continuar.
              </p>
            )}
            <p className="export-canva-help">
              No Canva, escolha{" "}
              <strong>Criar um design → Importar arquivo</strong> e selecione o
              .pptx baixado.
            </p>
          </section>

          <section
            className="export-canva-option export-canva-option-disabled"
            aria-label="Exportação direta para o Canva"
            aria-disabled="true"
          >
            <p className="export-canva-option-label">B · Direto no Canva</p>
            <p className="export-canva-option-description">
              Em breve (requer Canva Enterprise).
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
