import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
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
const eventInfo: Record<
  string,
  { type: string; description: string; href?: string }
> = {
  "user.invited": {
    type: "Usuários",
    description: "Novo acesso criado e convite processado.",
  },
  "user.invite_failed": {
    type: "Usuários",
    description: "O convite não foi concluído; a conta foi removida.",
  },
  "user.password_reset_sent": {
    type: "Usuários",
    description: "Link de acesso ou redefinição enviado por um administrador.",
  },
  "user.password_reset_failed": {
    type: "Usuários",
    description: "Falha ao enviar link de acesso ou redefinição.",
  },
  "user.deleted": {
    type: "Usuários",
    description: "Conta removida por um administrador.",
  },
  "workspace.member_added": {
    type: "Usuários",
    description: "Pessoa adicionada ao workspace.",
  },
  "workspace.member_updated": {
    type: "Usuários",
    description: "Papel ou inclusão nas estatísticas atualizado.",
  },
  "workspace.created": {
    type: "Workspace",
    description: "Workspace criado.",
  },
  "workspace.updated": {
    type: "Workspace",
    description: "Configurações do workspace atualizadas.",
  },
  "workspace.client_created": {
    type: "Conexões",
    description: "Conexão de cliente criada no workspace.",
  },
  "workspace.client_updated": {
    type: "Conexões",
    description: "Configurações da conexão de cliente atualizadas.",
  },
  "campaign.preview_created": {
    type: "Campanha",
    description: "Prévia de campanha preparada; nenhum envio foi iniciado.",
    href: "/campanhas/atividade",
  },
  "campaign.confirmed": {
    type: "Campanha",
    description: "Campanha confirmada e colocada na fila de execução.",
    href: "/campanhas/atividade",
  },
  "campaign.confirmation_failed": {
    type: "Campanha",
    description: "A confirmação não foi registrada.",
    href: "/campanhas/atividade",
  },
  "campaign.execution_finished": {
    type: "Campanha",
    description: "O serviço conectado devolveu o resultado da execução.",
    href: "/campanhas/atividade",
  },
  "campaign.asset_operation_finished": {
    type: "Ativos de campanha",
    description: "O serviço conectado devolveu o resultado da operação.",
  },
  "campaign.asset_operation_requested": {
    type: "Ativos de campanha",
    description: "Operação de ativo colocada na fila do serviço conectado.",
  },
  "campaign.sync_completed": {
    type: "Sincronização",
    description: "Dados de campanhas sincronizados do serviço conectado.",
    href: "/campanhas",
  },
  "campaign.test_marked": {
    type: "Campanha",
    description: "Campanha marcada para ficar fora dos indicadores.",
    href: "/campanhas",
  },
  "campaign.test_unmarked": {
    type: "Campanha",
    description: "Campanha voltou a entrar nos indicadores.",
    href: "/campanhas",
  },
  "auth.login_succeeded": {
    type: "Autenticação",
    description:
      "Sessão válida iniciada; qualquer MFA exigido fica registrado separadamente.",
  },
  "auth.logout": {
    type: "Autenticação",
    description: "Saída solicitada pelo usuário.",
  },
  "auth.password_changed": {
    type: "Autenticação",
    description: "Senha alterada com sucesso.",
  },
  "auth.mfa_enabled": {
    type: "Autenticação",
    description: "Autenticação multifator ativada.",
  },
  "auth.mfa_verified": {
    type: "Autenticação",
    description: "Verificação multifator concluída.",
  },
  "auth.mfa_verification_failed": {
    type: "Autenticação",
    description: "Falha ao verificar o código multifator.",
  },
  "auth.password_reset_requested": {
    type: "Autenticação",
    description:
      "Solicitação de recuperação recebida; conta e e-mail não são registrados.",
  },
};
const detailLabels: Record<string, string> = {
  role_before: "Papel anterior",
  role_after: "Papel novo",
  excluded_before: "Excluído das estatísticas antes",
  excluded_after: "Excluído das estatísticas depois",
  email_sent: "E-mail aceito pelo serviço",
  recipient_count: "Destinatários",
  group_count: "Grupos",
  asset_type: "Tipo de ativo",
  item_count: "Itens",
  campaign_count: "Campanhas atualizadas",
  company_count: "Conexões consultadas",
  failure_count: "Falhas de sincronização",
  is_test: "Marcada como teste",
  changed_fields: "Campos alterados",
};

function eventDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(
      ([key, item]) =>
        detailLabels[key] &&
        ["string", "number", "boolean"].includes(typeof item),
    )
    .map(([key, item]) => ({
      label: detailLabels[key],
      value: typeof item === "boolean" ? (item ? "Sim" : "Não") : String(item),
    }));
}

function outcomeLabel(value: string) {
  return (
    {
      success: "Concluída",
      failure: "Falhou",
      partial: "Parcial",
      requested: "Solicitada",
    }[value] ?? "Estado não reconhecido"
  );
}

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
  const [campaigns, assets, workspaceEvents, members] = await Promise.all([
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
    access.client
      .from("pierphish_audit_events")
      .select(
        "id,action,resource_type,resource_id,resource_name,actor_user_id,actor_name,outcome,metadata,occurred_at",
      )
      .eq("workspace_id", key)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(201),
    access.client
      .from("pierphish_workspace_members")
      .select("user_id")
      .eq("workspace_id", key)
      .eq("status", "active"),
  ]);
  if (campaigns.error || assets.error || workspaceEvents.error || members.error)
    return gophishError(
      "Não foi possível carregar a auditoria deste workspace.",
      502,
    );

  const memberIds = Array.from(
    new Set(
      (members.data ?? []).map((member) => member.user_id).filter(Boolean),
    ),
  );
  const authEventsQuery = access.isGlobalAdmin
    ? access.client
        .from("pierphish_audit_events")
        .select(
          "id,action,resource_type,resource_id,resource_name,actor_user_id,actor_name,outcome,metadata,occurred_at",
        )
        .like("action", "auth.%")
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(201)
    : memberIds.length
      ? access.client
          .from("pierphish_audit_events")
          .select(
            "id,action,resource_type,resource_id,resource_name,actor_user_id,actor_name,outcome,metadata,occurred_at",
          )
          .like("action", "auth.%")
          .in("actor_user_id", memberIds)
          .order("occurred_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(201)
      : null;
  const globalUnscopedEventsQuery =
    access.isGlobalAdmin && key === persistedPrimaryWorkspaceId
      ? access.client
          .from("pierphish_audit_events")
          .select(
            "id,action,resource_type,resource_id,resource_name,actor_user_id,actor_name,outcome,metadata,occurred_at",
          )
          .is("workspace_id", null)
          .order("occurred_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(101)
      : null;
  const [authEvents, unscopedEvents] = await Promise.all([
    authEventsQuery,
    globalUnscopedEventsQuery,
  ]);
  if (authEvents?.error || unscopedEvents?.error)
    return gophishError(
      "Não foi possível carregar os eventos de autenticação.",
      502,
    );

  const events = [
    ...(workspaceEvents.data ?? []),
    ...(authEvents?.data ?? []),
    ...(unscopedEvents?.data ?? []),
  ].filter(
    (event, index, all) =>
      all.findIndex((item) => item.id === event.id) === index,
  );

  const actorIds = Array.from(
    new Set(events.map((event) => event.actor_user_id).filter(Boolean)),
  );
  const avatarRows = actorIds.length
    ? await access.client
        .from("pierphish_user_preferences")
        .select("user_id,avatar_path")
        .in("user_id", actorIds)
    : { data: [], error: null };
  if (avatarRows.error)
    return gophishError(
      "Não foi possível carregar os perfis dos responsáveis.",
      502,
    );
  const avatarByUserId = new Map(
    (avatarRows.data ?? [])
      .filter((row) => typeof row.avatar_path === "string")
      .map((row) => {
        const path = String(row.avatar_path)
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        return [
          row.user_id,
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-avatars/${path}`,
        ] as const;
      }),
  );
  const eventCampaignIds = new Set(
    events
      .filter((event) =>
        ["campaign.confirmed", "campaign.execution_finished"].includes(
          event.action,
        ),
      )
      .map((event) => event.resource_id)
      .filter(Boolean),
  );
  const eventAssetIds = new Set(
    events
      .filter((event) =>
        [
          "campaign.asset_operation_requested",
          "campaign.asset_operation_finished",
        ].includes(event.action),
      )
      .map((event) => event.resource_id)
      .filter(Boolean),
  );

  const items: AuditLogItem[] = [
    ...(campaigns.data ?? [])
      .filter((c) => !eventCampaignIds.has(c.id))
      .slice(0, 100)
      .map((c) => ({
        id: `campaign:${c.id}`,
        title: c.campaign_name,
        description: "Solicitação de campanha confirmada no PierSec.",
        timestamp: c.queued_at,
        finishedAt: c.finished_at,
        actor: c.requested_by_name,
        type: "Campanha",
        status: statusLabels[c.status] ?? "Estado não reconhecido",
        href: "/campanhas/atividade",
        recordKind: "request" as const,
      })),
    ...(assets.data ?? [])
      .filter((c) => !eventAssetIds.has(c.id))
      .slice(0, 100)
      .map((c) => ({
        id: `asset:${c.id}`,
        title: c.asset_name,
        description: "Solicitação de operação no serviço de campanhas.",
        timestamp: c.queued_at,
        finishedAt: c.finished_at,
        actor: c.requested_by_name,
        type: assetLabels[c.asset_type] ?? "Operação",
        status: statusLabels[c.status] ?? "Estado não reconhecido",
        href: assetLinks[c.asset_type] ?? "/campanhas/atividade",
        recordKind: "request" as const,
      })),
    ...events.slice(0, 200).map((event) => {
      const info = eventInfo[event.action] ?? {
        type: "Operação",
        description: "Evento de operação registrado pelo PierSec.",
      };
      return {
        id: `event:${event.id}`,
        title: event.resource_name || event.resource_type || info.type,
        description: info.description,
        timestamp: event.occurred_at,
        actor: event.actor_name || "Evento sem usuário identificado",
        actorPhoto: event.actor_user_id
          ? (avatarByUserId.get(event.actor_user_id) ?? null)
          : null,
        type: info.type,
        status: outcomeLabel(event.outcome),
        href: info.href,
        details: eventDetails(event.metadata),
        recordKind: "event" as const,
      };
    }),
  ].sort(
    (a, b) =>
      Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
      a.id.localeCompare(b.id),
  );

  return NextResponse.json(
    {
      items,
      hasMore:
        (campaigns.data?.length ?? 0) > 100 ||
        (assets.data?.length ?? 0) > 100 ||
        events.length > 200,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
