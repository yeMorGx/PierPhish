import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";
import type { AuditLogItem } from "@/lib/audit-types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const assetLabels: Record<string, string> = {
  group: "Grupo",
  template: "Modelo de e-mail",
  page: "Página de destino",
  sending_profile: "Perfil de envio",
  campaign_results: "Consulta de resultados",
};
const assetLinks: Record<string, string> = {
  group: "/campanhas/grupos",
  template: "/campanhas/modelos",
  page: "/campanhas/paginas",
  sending_profile: "/campanhas/envio",
  campaign_results: "/campanhas/atividade",
};
const statusLabels: Record<string, string> = {
  queued: "Na fila",
  processing: "Em processamento",
  succeeded: "Concluída",
  failed: "Falhou",
  uncertain: "Verificação necessária",
  expired: "Expirada",
};
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!isWorkspaceId(workspaceId))
    return gophishError("Workspace inválido.", 400);
  const access = await requireGophishWorkspaceAccess(
    request,
    workspaceId,
    true,
  );
  if (access.error) return access.error;
  const key = databaseWorkspaceId(workspaceId);
  const [campaigns, assets] = await Promise.all([
    access.client
      .from("pierphish_gophish_campaign_commands")
      .select("id,campaign_name,requested_by_name,status,queued_at,finished_at")
      .eq("workspace_id", key)
      .order("queued_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(101),
    access.client
      .from("pierphish_campaign_asset_commands")
      .select(
        "id,asset_name,asset_type,requested_by_name,status,queued_at,finished_at",
      )
      .eq("workspace_id", key)
      .order("queued_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(101),
  ]);
  if (campaigns.error || assets.error)
    return gophishError(
      "Não foi possível carregar a auditoria deste workspace.",
      502,
    );
  const items: AuditLogItem[] = [
    ...(campaigns.data ?? []).slice(0, 100).map((c) => ({
      id: `campaign:${c.id}`,
      title: c.campaign_name,
      description: "Solicitação de campanha confirmada no PierSec.",
      timestamp: c.queued_at,
      finishedAt: c.finished_at,
      actor: c.requested_by_name,
      type: "Campanha",
      status: statusLabels[c.status] ?? "Estado não reconhecido",
      href: "/campanhas/atividade",
    })),
    ...(assets.data ?? []).slice(0, 100).map((c) => ({
      id: `asset:${c.id}`,
      title: c.asset_name,
      description: "Solicitação de operação no serviço de campanhas.",
      timestamp: c.queued_at,
      finishedAt: c.finished_at,
      actor: c.requested_by_name,
      type: assetLabels[c.asset_type] ?? "Operação",
      status: statusLabels[c.status] ?? "Estado não reconhecido",
      href: assetLinks[c.asset_type] ?? "/campanhas/atividade",
    })),
  ].sort(
    (a, b) =>
      Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
      a.id.localeCompare(b.id),
  );
  return NextResponse.json(
    {
      items,
      hasMore:
        (campaigns.data?.length ?? 0) > 100 || (assets.data?.length ?? 0) > 100,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
