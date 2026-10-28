"use client";

import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import type { CampaignSummary } from "./types";

export function DeliveryIssuesDialog({
  open,
  onOpenChange,
  campaigns,
  failuresAvailable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: CampaignSummary[];
  failuresAvailable: boolean;
}) {
  const rows = campaigns
    .map((c) => {
      const known = failuresAvailable || typeof c.stats.error === "number";
      const gap = c.people - c.deliveredPeople - c.errorPeople;
      return {
        ...c,
        failed: known ? c.errorPeople : null,
        pending: known && gap >= 0 ? gap : null,
      };
    })
    .filter(
      (c) =>
        c.failed === null ||
        c.pending === null ||
        c.failed > 0 ||
        c.pending > 0,
    );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="delivery-issues-backdrop" />
        <Dialog.Popup className="delivery-issues-dialog">
          <div className="delivery-issues-heading">
            <Dialog.Title>Falhas e mensagens sem confirmação</Dialog.Title>
            <Dialog.Close aria-label="Fechar detalhes de entrega">
              Fechar
            </Dialog.Close>
          </div>
          <Dialog.Description>
            Falhas têm erro registrado. Sem confirmação é a diferença ainda sem
            resultado identificado; não significa rejeição. Consulte cada
            campanha para investigar os destinatários.
          </Dialog.Description>
          <dl className="delivery-issues-summary">
            <div>
              <dt>Falhas confirmadas</dt>
              <dd>
                {rows.every((c) => c.failed !== null)
                  ? rows
                      .reduce((sum, c) => sum + (c.failed ?? 0), 0)
                      .toLocaleString("pt-BR")
                  : "Não informado"}
              </dd>
            </div>
            <div>
              <dt>Sem confirmação</dt>
              <dd>
                {rows.every((c) => c.pending !== null)
                  ? rows
                      .reduce((sum, c) => sum + (c.pending ?? 0), 0)
                      .toLocaleString("pt-BR")
                  : "Não informado"}
              </dd>
            </div>
          </dl>
          <div className="delivery-issues-list">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Falhas</th>
                  <th>Sem confirmação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/campaigns/${c.id}`}>{c.name}</Link>
                    </td>
                    <td>
                      {c.failed?.toLocaleString("pt-BR") ?? "Não informado"}
                    </td>
                    <td>
                      {c.pending?.toLocaleString("pt-BR") ?? "Não informado"}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={3}>
                      Nenhuma falha ou mensagem sem confirmação neste filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
