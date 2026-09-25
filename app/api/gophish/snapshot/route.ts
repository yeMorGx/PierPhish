import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { gophishError, gophishServiceClient } from "@/lib/server-gophish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boundedCount(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0
    ? Math.min(number, 1_000_000_000)
    : 0;
}

function cleanSnapshot(value: unknown) {
  if (!isRecord(value)) return null;
  const sourceGroups = Array.isArray(value.groups) ? value.groups : [];
  const sourceCampaigns = Array.isArray(value.campaigns) ? value.campaigns : [];
  const sourceTemplates = Array.isArray(value.templates) ? value.templates : [];
  const sourcePages = Array.isArray(value.pages) ? value.pages : [];
  const sourceSendingProfiles = Array.isArray(value.sendingProfiles)
    ? value.sendingProfiles
    : [];
  if (
    sourceGroups.length > 2000 ||
    sourceCampaigns.length > 2000 ||
    sourceTemplates.length > 2000 ||
    sourcePages.length > 2000 ||
    sourceSendingProfiles.length > 2000
  )
    return null;

  const groups = sourceGroups.filter(isRecord).map((group) => ({
    id: boundedCount(group.id),
    name: boundedText(group.name),
    numTargets: boundedCount(group.numTargets),
    modifiedDate: boundedText(group.modifiedDate, 50),
  }));
  const templates = sourceTemplates.filter(isRecord).map((template) => ({
    id: boundedCount(template.id),
    name: boundedText(template.name),
    modifiedDate: boundedText(template.modifiedDate, 50),
  }));
  const pages = sourcePages.filter(isRecord).map((page) => ({
    id: boundedCount(page.id),
    name: boundedText(page.name),
    captureCredentials:
      typeof page.captureCredentials === "boolean"
        ? page.captureCredentials
        : null,
    capturePasswords:
      typeof page.capturePasswords === "boolean" ? page.capturePasswords : null,
    modifiedDate: boundedText(page.modifiedDate, 50),
  }));
  const sendingProfiles = sourceSendingProfiles
    .filter(isRecord)
    .map((profile) => ({
      id: boundedCount(profile.id),
      name: boundedText(profile.name),
      modifiedDate: boundedText(profile.modifiedDate, 50),
    }));

  const statsKeys = [
    "total",
    "sent",
    "opened",
    "clicked",
    "submittedData",
    "emailReported",
    "error",
  ] as const;
  const campaigns = sourceCampaigns.filter(isRecord).map((campaign) => {
    const rawStats = isRecord(campaign.stats) ? campaign.stats : {};
    const stats = Object.fromEntries(
      statsKeys.map((key) => [key, boundedCount(rawStats[key])]),
    );
    const groupNames = Array.isArray(campaign.groups)
      ? campaign.groups
          .slice(0, 100)
          .map((group) =>
            typeof group === "string"
              ? boundedText(group)
              : isRecord(group)
                ? boundedText(group.name)
                : "",
          )
          .filter(Boolean)
      : [];
    return {
      id: boundedCount(campaign.id),
      name: boundedText(campaign.name),
      status: boundedText(campaign.status, 80),
      createdAt: boundedText(campaign.createdAt, 50),
      launchAt: boundedText(campaign.launchAt, 50),
      completedAt: boundedText(campaign.completedAt, 50),
      template: boundedText(campaign.template, 160),
      page: boundedText(campaign.page, 160),
      groups: groupNames,
      stats,
    };
  });

  return {
    updatedAt: boundedText(value.updatedAt, 50),
    commandEncryptionKey: boundedText(value.commandEncryptionKey, 4096),
    groups,
    campaigns,
    templates,
    pages,
    sendingProfiles,
  };
}

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 200) {
    return gophishError("Credencial do conector inválida.", 401);
  }

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    return gophishError("Snapshot acima do limite permitido.", 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return gophishError("Snapshot inválido.", 400);
  }
  if (!isRecord(body)) return gophishError("Snapshot inválido.", 400);
  const snapshot = cleanSnapshot(body.snapshot);
  if (!snapshot) return gophishError("Snapshot inválido.", 400);

  const client = gophishServiceClient();
  if (!client)
    return gophishError("Conector não configurado no servidor.", 503);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: connector, error: lookupError } = await client
    .from("pierphish_gophish_connectors")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (lookupError)
    return gophishError("Não foi possível validar o conector.", 502);
  if (!connector) return gophishError("Credencial do conector inválida.", 401);

  const { error } = await client
    .from("pierphish_gophish_connectors")
    .update({ snapshot, last_seen: new Date().toISOString() })
    .eq("id", connector.id);
  if (error) return gophishError("Não foi possível atualizar a conexão.", 502);

  return NextResponse.json(
    { accepted: true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
