import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getDefaultKey(
  modernName: string,
  legacyName: string,
  singleName?: string,
): string | null {
  const single = singleName ? Deno.env.get(singleName) : null;
  if (single) return single;

  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;

  const dictionary = Deno.env.get(modernName);
  if (!dictionary) return null;

  try {
    const parsed = JSON.parse(dictionary);
    return parsed.default ?? null;
  } catch {
    return null;
  }
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
  return text.length > 0 ? text : null;
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

function isOlderThan(value: unknown, days: number): boolean {
  const date = dateOrNull(value);
  if (!date || !Number.isFinite(days)) return false;
  return Date.parse(date) < Date.now() - days * 24 * 60 * 60 * 1000;
}

function eventTypeFrom(event: JsonRecord): string | null {
  const nestedDetails = isRecord(event.details) ? event.details : {};
  const candidates = [
    event.message,
    event.event_type,
    event.type,
    event.name,
    event.status,
    nestedDetails.event_type,
    nestedDetails.type,
    nestedDetails.name,
    typeof event.details === "string" ? event.details : null,
  ];

  for (const candidate of candidates) {
    const value = nullableText(candidate);
    if (value) return value;
  }

  return null;
}

async function hashEvent(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function main(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getDefaultKey(
    "SUPABASE_PUBLISHABLE_KEYS",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );
  const secretKey = getDefaultKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  );
  const beephishBaseUrl = Deno.env
    .get("BEEPHISH_BASE_URL")
    ?.replace(/\/+$/, "");
  const beephishAuthorization = Deno.env.get("BEEPHISH_AUTHORIZATION");
  const eventsRetentionDays = Number(
    Deno.env.get("BEEPHISH_EVENTS_RETENTION_DAYS") ?? "90",
  );

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return jsonResponse({ error: "Configuração do Supabase incompleta." }, 500);
  }

  if (!beephishBaseUrl || !beephishAuthorization) {
    return jsonResponse(
      { error: "Secrets da Beephish não configurados." },
      500,
    );
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Sessão do Supabase não informada." }, 401);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Sessão inválida ou expirada." }, 401);
  }

  const { data: isAdmin, error: adminError } =
    await userClient.rpc("is_internal_admin");
  if (adminError || isAdmin !== true) {
    return jsonResponse({ error: "Usuário não autorizado." }, 403);
  }

  const adminClient = createClient(supabaseUrl, secretKey);

  async function beephishGet(path: string): Promise<any> {
    const response = await fetch(`${beephishBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: beephishAuthorization,
      },
    });

    const text = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 200) };
    }

    if (!response.ok || payload?.success === false) {
      throw new Error(`Beephish respondeu HTTP ${response.status} em ${path}.`);
    }

    return payload;
  }

  async function syncCampaign(campaign: JsonRecord, syncEvents: boolean) {
    const campaignId = numberOrNull(campaign.id);
    if (campaignId === null) throw new Error("Campanha sem ID.");

    const { error: campaignError } = await adminClient
      .from("beephish_campaigns")
      .upsert({
        id: campaignId,
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
    );
    const resultItems = extractItems(resultsPayload);
    const resultRows = resultItems
      .filter((item) => isRecord(item) && item.id !== undefined)
      .map((item: JsonRecord) => ({
        campaign_id: campaignId,
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

    if (resultRows.length > 0) {
      const { error: resultsError } = await adminClient
        .from("beephish_results")
        .upsert(resultRows, { onConflict: "campaign_id,beephish_id" });
      if (resultsError) throw resultsError;
    }

    let eventCount = 0;
    let eventWarning: string | null = null;

    if (!syncEvents) {
      return {
        campaignId,
        results: resultRows.length,
        events: 0,
        eventWarning: "Eventos antigos não foram sincronizados.",
      };
    }

    try {
      const eventsPayload = await beephishGet(
        `/v1/phishing/campaigns/${campaignId}/events`,
      );
      const eventItems = extractItems(eventsPayload);
      const eventRows = [];

      for (const rawEvent of eventItems) {
        const event = isRecord(rawEvent) ? rawEvent : { value: rawEvent };
        const explicitId =
          event.id ?? event.event_id ?? event.eventId ?? event.key;
        const eventId =
          explicitId === undefined
            ? await hashEvent(event)
            : String(explicitId);

        eventRows.push({
          campaign_id: campaignId,
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

      if (eventRows.length > 0) {
        const { error: eventsError } = await adminClient
          .from("beephish_events")
          .upsert(eventRows, { onConflict: "campaign_id,beephish_event_id" });
        if (eventsError) throw eventsError;
        eventCount = eventRows.length;
      }
    } catch (error) {
      eventWarning =
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar eventos.";
    }

    return {
      campaignId,
      results: resultRows.length,
      events: eventCount,
      eventWarning,
    };
  }

  const requestBody = await req.json().catch(() => ({}));
  const requestedId = requestBody?.campaignId;
  const campaignId =
    requestedId === undefined || requestedId === null
      ? null
      : numberOrNull(requestedId);

  if (
    requestedId !== undefined &&
    requestedId !== null &&
    campaignId === null
  ) {
    return jsonResponse({ error: "campaignId precisa ser numérico." }, 400);
  }

  const campaignsPayload = await beephishGet("/v1/phishing/campaigns");
  const campaigns = extractItems(campaignsPayload).filter(isRecord);
  const selectedCampaigns =
    campaignId === null
      ? campaigns
      : campaigns.filter((campaign) => Number(campaign.id) === campaignId);

  if (selectedCampaigns.length === 0) {
    return jsonResponse({ error: "Campanha não encontrada na Beephish." }, 404);
  }

  const synced = [];
  for (const campaign of selectedCampaigns) {
    synced.push(
      await syncCampaign(
        campaign,
        !isOlderThan(campaign.completed_date, eventsRetentionDays),
      ),
    );
  }

  return jsonResponse({
    success: true,
    userId: userData.user.id,
    skippedOldCampaigns: 0,
    campaigns: synced,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST." }, 405);
  }

  try {
    return await main(req);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error(details);
    return jsonResponse(
      { error: "Falha ao sincronizar a Beephish.", details },
      500,
    );
  }
});
