import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

export const runtime = "nodejs";

type RecordValue = Record<string, unknown>;
function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
function assetId(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 0;
}
function parsedDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RecordValue | null;
  if (!body || !isWorkspaceId(body.workspaceId)) {
    return gophishError("Workspace inválido.", 400);
  }
  const access = await requireGophishWorkspaceAccess(
    request,
    body.workspaceId,
    true,
  );
  if (access.error) return access.error;

  const campaignName = cleanText(body.campaignName, 120);
  const url = cleanText(body.url, 2048);
  let destination: URL;
  try {
    destination = new URL(url);
  } catch {
    return gophishError("Informe uma URL de destino HTTPS válida.", 400);
  }
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password
  ) {
    return gophishError("A URL de destino precisa usar HTTPS.", 400);
  }
  if (!campaignName) return gophishError("Informe o nome da campanha.", 400);

  const connectorId = cleanText(body.connectorId, 50);
  const groupIds = Array.isArray(body.groupIds)
    ? body.groupIds.map(assetId)
    : [];
  if (
    !connectorId ||
    groupIds.length < 1 ||
    groupIds.length > 20 ||
    groupIds.some((id) => id === 0) ||
    new Set(groupIds).size !== groupIds.length
  ) {
    return gophishError("Escolha um conector e de 1 a 20 grupos válidos.", 400);
  }
  const templateId = assetId(body.templateId);
  const pageId = assetId(body.pageId);
  const sendingProfileId = assetId(body.sendingProfileId);
  if (!templateId || !pageId || !sendingProfileId) {
    return gophishError("Escolha modelo, página e perfil de envio.", 400);
  }

  const launchAt = parsedDate(body.launchAt);
  const sendBy = parsedDate(body.sendBy);
  if (
    body.launchAt &&
    (!launchAt || launchAt.getTime() < Date.now() + 120_000)
  ) {
    return gophishError(
      "O agendamento precisa estar pelo menos 2 minutos no futuro.",
      400,
    );
  }
  if (
    body.sendBy &&
    (!sendBy || !launchAt || sendBy.getTime() <= launchAt.getTime())
  ) {
    return gophishError(
      "O prazo final deve ser posterior ao horário de início agendado.",
      400,
    );
  }

  const { data: connector, error: connectorError } = await access.client
    .from("pierphish_gophish_connectors")
    .select("id,snapshot,last_seen")
    .eq("id", connectorId)
    .eq("workspace_id", databaseWorkspaceId(body.workspaceId))
    .maybeSingle();
  if (connectorError)
    return gophishError("Não foi possível validar o conector.", 502);
  if (
    !connector ||
    !connector.last_seen ||
    Date.now() - new Date(connector.last_seen).getTime() >= 90_000
  ) {
    return gophishError(
      "O conector está offline. Atualize o estado e tente novamente.",
      409,
    );
  }
  const snapshot = isRecord(connector.snapshot) ? connector.snapshot : {};
  const groups = Array.isArray(snapshot.groups)
    ? snapshot.groups.filter(isRecord)
    : [];
  const templates = Array.isArray(snapshot.templates)
    ? snapshot.templates.filter(isRecord)
    : [];
  const pages = Array.isArray(snapshot.pages)
    ? snapshot.pages.filter(isRecord)
    : [];
  const profiles = Array.isArray(snapshot.sendingProfiles)
    ? snapshot.sendingProfiles.filter(isRecord)
    : [];
  const selectedGroups = groupIds.map((id) =>
    groups.find((group) => group.id === id),
  );
  const template = templates.find((item) => item.id === templateId);
  const page = pages.find((item) => item.id === pageId);
  const sendingProfile = profiles.find((item) => item.id === sendingProfileId);
  if (
    selectedGroups.some((group) => !group) ||
    !template ||
    !page ||
    !sendingProfile
  ) {
    return gophishError(
      "Um ativo mudou ou não está mais sincronizado. Atualize a lista.",
      409,
    );
  }
  if (page.captureCredentials !== false || page.capturePasswords !== false) {
    return gophishError(
      "Não foi possível confirmar que esta página está sem captura de credenciais. Escolha outra página.",
      400,
    );
  }
  const targetGroups = selectedGroups as RecordValue[];
  const recipientCount = targetGroups.reduce(
    (total, group) =>
      total +
      (Number.isSafeInteger(group.numTargets) ? Number(group.numTargets) : 0),
    0,
  );
  if (recipientCount < 1)
    return gophishError("Os grupos selecionados não têm destinatários.", 400);

  const selected = {
    campaignName,
    groups: targetGroups.map((group) => ({
      id: assetId(group.id),
      name: cleanText(group.name, 160),
      numTargets: Number(group.numTargets) || 0,
      modifiedDate: cleanText(group.modifiedDate, 50),
    })),
    template: {
      id: templateId,
      name: cleanText(template.name, 160),
      modifiedDate: cleanText(template.modifiedDate, 50),
    },
    page: {
      id: pageId,
      name: cleanText(page.name, 160),
      modifiedDate: cleanText(page.modifiedDate, 50),
      captureCredentials: false,
      capturePasswords: false,
    },
    sendingProfile: {
      id: sendingProfileId,
      name: cleanText(sendingProfile.name, 160),
      modifiedDate: cleanText(sendingProfile.modifiedDate, 50),
    },
  };
  const campaign: RecordValue = {
    name: campaignName,
    template: { name: selected.template.name },
    page: { name: selected.page.name },
    smtp: { name: selected.sendingProfile.name },
    url: destination.toString(),
    groups: selected.groups.map(({ name }) => ({ name })),
  };
  if (launchAt) campaign.launch_date = launchAt.toISOString();
  if (sendBy) campaign.send_by_date = sendBy.toISOString();
  const payload = { campaign, selected };
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const { data: preview, error: previewError } = await access.client
    .from("pierphish_gophish_campaign_previews")
    .insert({
      workspace_id: databaseWorkspaceId(body.workspaceId),
      connector_id: connector.id,
      requested_by: access.userId,
      requested_by_name: access.userLabel,
      campaign_name: campaignName,
      selected_groups: selected.groups,
      recipient_count: recipientCount,
      template_name: selected.template.name,
      landing_page_name: selected.page.name,
      sending_profile_name: selected.sendingProfile.name,
      launch_at: launchAt?.toISOString() ?? null,
      send_by: sendBy?.toISOString() ?? null,
      payload,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (previewError || !preview) {
    return gophishError(
      "Não foi possível registrar a prévia da campanha.",
      502,
    );
  }
  return NextResponse.json(
    {
      previewId: preview.id,
      expiresAt,
      campaignName,
      groups: selected.groups,
      recipientCount,
      template: selected.template.name,
      page: selected.page.name,
      sendingProfile: selected.sendingProfile.name,
      launchAt: launchAt?.toISOString() ?? null,
      sendBy: sendBy?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
