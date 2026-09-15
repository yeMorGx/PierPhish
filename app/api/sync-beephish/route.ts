import { createDecipheriv, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const credentialKey = process.env.PIERPHISH_CREDENTIAL_KEY;
const beephishBaseUrl = (
  process.env.BEEPHISH_BASE_URL ?? "https://portal.beephish.com/api"
).replace(/\/+$/, "");
const legacyAuthorization = process.env.BEEPHISH_AUTHORIZATION;
const superAdminEmail = "admin@teste.com";
const eventsRetentionDays = Number(
  process.env.BEEPHISH_EVENTS_RETENTION_DAYS ?? "90",
);

type JsonRecord = Record<string, any>;
type Company = {
  id: string;
  workspace_id: string;
  name: string;
  client_id: string;
  client_secret_ciphertext: string;
  status: "active" | "inactive";
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function jsonError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (isRecord(error)) {
    const message = error.message ?? error.error_description ?? error.error;
    if (message) return String(message);
    try {
      return JSON.stringify(error);
    } catch {
      return "Erro desconhecido.";
    }
  }
  return "Erro desconhecido.";
}

function getClient(key: string, token?: string) {
  if (!supabaseUrl) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : {}),
  });
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !supabaseUrl || !(publishableKey ?? serviceRoleKey)) {
    return { error: errorResponse("Sessão não encontrada.", 401) };
  }

  const authClient = getClient(publishableKey ?? serviceRoleKey!, token);
  if (!authClient)
    return { error: errorResponse("Supabase não configurado.", 503) };

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: errorResponse("Sua sessão não é válida.", 401) };
  }

  let admin = data.user.email?.toLowerCase() === superAdminEmail;
  if (!admin) {
    const result = await authClient.rpc("is_internal_admin");
    admin = !result.error && result.data === true;
  }
  if (!admin) return { error: errorResponse("Usuário não autorizado.", 403) };

  const client = serviceRoleKey ? getClient(serviceRoleKey) : authClient;
  if (!client)
    return { error: errorResponse("Supabase não configurado.", 503) };
  return { client, userId: data.user.id };
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function decryptSecret(ciphertext: string) {
  if (!credentialKey) {
    throw new Error(
      "PIERPHISH_CREDENTIAL_KEY não está configurada no servidor.",
    );
  }
  const [version, ivText, tagText, encryptedText] = ciphertext.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("A credencial Beephish está em um formato inválido.");
  }
  const key = createHash("sha256").update(credentialKey).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    decodeBase64Url(ivText),
  );
  decipher.setAuthTag(decodeBase64Url(tagText));
  return Buffer.concat([
    decipher.update(decodeBase64Url(encryptedText)),
    decipher.final(),
  ]).toString("utf8");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.data?.items,
    payload?.data?.events,
    payload?.data?.results,
    payload?.items,
    payload?.events,
    payload?.results,
  ];
  return candidates.find(Array.isArray) ?? [];
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateOrNull(value: unknown): string | null {
  const text = nullableText(value);
  if (!text || text.startsWith("0001-01-01")) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isOlderThan(value: unknown, days: number) {
  const date = dateOrNull(value);
  return Boolean(
    date &&
      Number.isFinite(days) &&
      Date.parse(date) < Date.now() - days * 24 * 60 * 60 * 1000,
  );
}

function eventTypeFrom(event: JsonRecord) {
  const details = isRecord(event.details) ? event.details : {};
  for (const candidate of [
    event.message,
    event.event_type,
    event.type,
    event.name,
    event.status,
    details.event_type,
    details.type,
    details.name,
    typeof event.details === "string" ? event.details : null,
  ]) {
    const value = nullableText(candidate);
    if (value) return value;
  }
  return null;
}

async function hashEvent(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function basicAuthorization(company: Company) {
  const secret = decryptSecret(company.client_secret_ciphertext);
  return `Basic ${Buffer.from(`${company.client_id}:${secret}`, "utf8").toString("base64")}`;
}

async function beephishGet(path: string, authorization: string) {
  const response = await fetch(`${beephishBaseUrl}${path}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  });
  const text = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "A Beephish recusou o Client ID/Client Secret informado.",
      );
    }
    throw new Error(`Beephish respondeu HTTP ${response.status} em ${path}.`);
  }
  return payload;
}

async function syncCompany(
  client: SupabaseClient,
  company: Company | null,
  workspaceId: string,
  requestedCampaignId: number | null,
) {
  const authorization = company
    ? basicAuthorization(company)
    : legacyAuthorization;
  if (!authorization) {
    throw new Error(
      "Nenhuma credencial Beephish disponível para este workspace.",
    );
  }

  const campaignsPayload = await beephishGet(
    "/v1/phishing/campaigns",
    authorization,
  );
  const campaigns = extractItems(campaignsPayload).filter(isRecord);
  const selectedCampaigns =
    requestedCampaignId === null
      ? campaigns
      : campaigns.filter(
          (campaign) => Number(campaign.id) === requestedCampaignId,
        );
  if (!selectedCampaigns.length) {
    throw new Error(
      requestedCampaignId === null
        ? "Nenhuma campanha foi encontrada nesta conexão."
        : "Campanha não encontrada na Beephish.",
    );
  }

  const synced: Array<{ campaignId: number; results: number; events: number }> =
    [];
  const failures: Array<{ campaignId: number | null; error: string }> = [];
  for (const campaign of selectedCampaigns) {
    const campaignId = numberOrNull(campaign.id);
    try {
      if (campaignId === null) throw new Error("Campanha sem ID.");

      const { error: campaignError } = await client
        .from("beephish_campaigns")
        .upsert({
          id: campaignId,
          workspace_id: workspaceId,
          company_id: company?.id ?? null,
          name: String(campaign.name ?? `Campanha ${campaignId}`),
          status: nullableText(campaign.status),
          created_date: dateOrNull(campaign.created_date),
          launch_date: dateOrNull(campaign.launch_date),
          completed_date: dateOrNull(campaign.completed_date),
          creator_id: numberOrNull(campaign.creator?.id),
          creator_name: nullableText(campaign.creator?.name),
          group_names: Array.isArray(campaign.groups)
            ? campaign.groups
                .map((group: any) => nullableText(group?.name))
                .filter(Boolean)
            : [],
          stats: isRecord(campaign.stats) ? campaign.stats : {},
          synced_at: new Date().toISOString(),
        });
      if (campaignError) throw campaignError;

      const resultsPayload = await beephishGet(
        `/v1/phishing/campaigns/${campaignId}/results`,
        authorization,
      );
      const resultRows = extractItems(resultsPayload)
        .filter((item) => isRecord(item) && item.id !== undefined)
        .map((item: JsonRecord) => ({
          campaign_id: campaignId,
          workspace_id: workspaceId,
          company_id: company?.id ?? null,
          beephish_id: String(item.id),
          status: nullableText(item.status),
          reported: item.reported === true,
          email: nullableText(item.email),
          first_name: nullableText(item.first_name),
          last_name: nullableText(item.last_name),
          position: nullableText(item.position),
          department: nullableText(item.department),
          ip: nullableText(item.ip),
          latitude: numberOrNull(item.latitude),
          longitude: numberOrNull(item.longitude),
          send_date: dateOrNull(item.send_date),
          modified_date: dateOrNull(item.modified_date),
          target_id: numberOrNull(item.target_id),
          template_id: numberOrNull(item.template_id),
          template_name: nullableText(item.template_name),
          non_delivery_reason: nullableText(item.non_delivery_reason),
          non_delivery_detail: nullableText(item.non_delivery_detail),
          non_delivery_code: nullableText(item.non_delivery_code),
          raw: item,
        }));
      if (resultRows.length) {
        const { error } = await client
          .from("beephish_results")
          .upsert(resultRows, { onConflict: "campaign_id,beephish_id" });
        if (error) throw error;
      }

      let eventCount = 0;
      if (!isOlderThan(campaign.completed_date, eventsRetentionDays)) {
        const eventsPayload = await beephishGet(
          `/v1/phishing/campaigns/${campaignId}/events`,
          authorization,
        );
        const eventRows = [];
        for (const rawEvent of extractItems(eventsPayload)) {
          const event = isRecord(rawEvent) ? rawEvent : { value: rawEvent };
          const explicitId =
            event.id ?? event.event_id ?? event.eventId ?? event.key;
          const eventId =
            explicitId === undefined
              ? await hashEvent(event)
              : String(explicitId);
          eventRows.push({
            campaign_id: campaignId,
            workspace_id: workspaceId,
            company_id: company?.id ?? null,
            beephish_event_id: eventId,
            event_type: eventTypeFrom(event),
            email: nullableText(
              event.email ?? event.user?.email ?? event.target?.email,
            ),
            occurred_at: dateOrNull(
              event.occurred_at ??
                event.occurredAt ??
                event.created_at ??
                event.createdAt ??
                event.timestamp ??
                event.time ??
                event.date ??
                event.modified_date,
            ),
            ip: nullableText(event.ip),
            payload: event,
          });
        }
        if (eventRows.length) {
          const { error } = await client
            .from("beephish_events")
            .upsert(eventRows, { onConflict: "campaign_id,beephish_event_id" });
          if (error) throw error;
          eventCount = eventRows.length;
        }
      }

      synced.push({
        campaignId,
        results: resultRows.length,
        events: eventCount,
      });
    } catch (error) {
      failures.push({ campaignId, error: jsonError(error) });
    }
  }
  if (!synced.length) {
    throw new Error(failures[0]?.error ?? "Não foi possível sincronizar.");
  }
  return { synced, failures };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error || !auth.client) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: unknown;
    companyId?: unknown;
    campaignId?: unknown;
  };
  const requestedCampaignId =
    body.campaignId === undefined || body.campaignId === null
      ? null
      : numberOrNull(body.campaignId);
  if (body.campaignId !== undefined && requestedCampaignId === null) {
    return errorResponse("campaignId precisa ser numérico.", 400);
  }

  const requestedWorkspaceId =
    typeof body.workspaceId === "string" && body.workspaceId.trim()
      ? body.workspaceId.trim()
      : "primary";
  const workspaceId =
    requestedWorkspaceId === "primary"
      ? persistedPrimaryWorkspaceId
      : requestedWorkspaceId;
  const requestedCompanyId =
    typeof body.companyId === "string" && body.companyId.trim()
      ? body.companyId.trim()
      : null;

  let companyQuery = auth.client
    .from("pierphish_companies")
    .select("id,workspace_id,name,client_id,client_secret_ciphertext,status")
    .eq("status", "active");
  if (requestedCompanyId)
    companyQuery = companyQuery.eq("id", requestedCompanyId);
  else companyQuery = companyQuery.eq("workspace_id", workspaceId);
  const { data: companyRows, error: companyError } = await companyQuery;
  if (companyError)
    return errorResponse("Não foi possível carregar as conexões.", 502);

  const companies = (companyRows ?? []) as Company[];
  if (
    !companies.length &&
    !requestedCompanyId &&
    workspaceId !== persistedPrimaryWorkspaceId
  ) {
    return NextResponse.json({
      success: true,
      workspaceId,
      connections: 0,
      campaigns: [],
    });
  }

  const targets: Array<Company | null> = companies.length ? companies : [null];
  const results: Array<{
    companyId: string | null;
    companyName: string;
    campaigns: unknown[];
    failures?: Array<{ campaignId: number | null; error: string }>;
    error?: string;
  }> = [];
  for (const company of targets) {
    try {
      const sync = await syncCompany(
        auth.client,
        company,
        company?.workspace_id ?? workspaceId,
        requestedCampaignId,
      );
      results.push({
        companyId: company?.id ?? null,
        companyName: company?.name ?? "Conexão global",
        campaigns: sync.synced,
        failures: sync.failures,
        error: sync.failures.length
          ? `${sync.failures.length} campanha(s) não puderam ser atualizadas.`
          : undefined,
      });
    } catch (error) {
      results.push({
        companyId: company?.id ?? null,
        companyName: company?.name ?? "Conexão global",
        campaigns: [],
        error: jsonError(error),
      });
    }
  }

  const successful = results.filter((result) => result.campaigns.length > 0);
  if (!successful.length) {
    return errorResponse(
      results[0]?.error ?? "Não foi possível sincronizar.",
      502,
    );
  }
  return NextResponse.json({
    success: true,
    userId: auth.userId,
    workspaceId,
    connections: results.length,
    failedConnections: results
      .filter((result) => result.error)
      .map(({ companyId, companyName, error }) => ({
        companyId,
        companyName,
        error,
      })),
    campaigns: successful.flatMap((result) => result.campaigns),
  });
}
