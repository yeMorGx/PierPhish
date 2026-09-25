import {
  createCipheriv,
  constants,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type AssetType = "group" | "template" | "page" | "sending_profile";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, limit: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, limit)
    : "";
}

function cleanBodyText(value: unknown, limit: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim()
        .slice(0, limit)
    : "";
}

function cleanHtml(value: unknown, allowCampaignUrl: boolean) {
  const source = typeof value === "string" ? value : "";
  if (source.length > 200_000) return null;
  if (
    !allowCampaignUrl &&
    /<\s*(form|input|button|textarea|select)\b/i.test(source)
  )
    return null;

  const marker = "https://piersec.invalid/__campaign_destination__";
  const safeSource = allowCampaignUrl
    ? source.replaceAll("{{.URL}}", marker)
    : source;
  const cleaned = sanitizeHtml(safeSource, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "hr",
      "li",
      "ol",
      "p",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      td: ["colspan"],
      th: ["colspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "noopener noreferrer",
        },
      }),
    },
  });
  return allowCampaignUrl ? cleaned.replaceAll(marker, "{{.URL}}") : cleaned;
}

function normalizeTargets(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500)
    return null;
  const targets: Array<{
    email: string;
    first_name: string;
    last_name: string;
    position: string;
  }> = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) return null;
    const email = cleanText(item.email, 320).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || seen.has(email))
      return null;
    seen.add(email);
    targets.push({
      email,
      first_name: cleanText(item.firstName ?? item.first_name, 100),
      last_name: cleanText(item.lastName ?? item.last_name, 100),
      position: cleanText(item.position, 120),
    });
  }
  return targets;
}

function encryptForConnector(publicKey: string, payload: JsonRecord) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const wrappedKey = publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    key,
  );
  key.fill(0);
  return {
    version: 1,
    wrappedKey: wrappedKey.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([ciphertext, cipher.getAuthTag()]).toString(
      "base64",
    ),
  };
}

function profilePayload(body: JsonRecord) {
  const name = cleanText(body.name, 120);
  const host = cleanText(body.host, 255);
  const fromAddress = cleanText(body.fromAddress, 254);
  const username = cleanText(body.username, 255);
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || !/^[A-Za-z0-9.-]+:\d{1,5}$/.test(host)) return null;
  const port = Number(host.slice(host.lastIndexOf(":") + 1));
  if (port < 1 || port > 65535) return null;
  if (
    !/^(?:[^<>]{1,100}\s*<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(
      fromAddress,
    ) ||
    username.length > 255 ||
    password.length > 512 ||
    Boolean(username) !== Boolean(password)
  )
    return null;
  return {
    name,
    payload: {
      name,
      host,
      from_address: fromAddress,
      interface_type: "SMTP",
      username,
      password,
      ignore_cert_errors: false,
    },
    itemCount: 0,
  };
}

function buildAsset(body: JsonRecord): {
  type: AssetType;
  name: string;
  itemCount: number;
  payload: JsonRecord;
} | null {
  const type = body.type;
  if (type === "group") {
    const name = cleanText(body.name, 120);
    const targets = normalizeTargets(body.targets);
    if (!name || !targets) return null;
    return {
      type,
      name,
      itemCount: targets.length,
      payload: { name, targets },
    };
  }
  if (type === "template") {
    const name = cleanText(body.name, 120);
    const subject = cleanText(body.subject, 200);
    const text = cleanBodyText(body.text, 100_000);
    const html = cleanHtml(body.html, true);
    if (!name || !subject || html === null || (!text && !html)) return null;
    const trackedHtml = html
      ? `${html}<img src="{{.Tracker}}" alt="" width="1" height="1" />`
      : "";
    return {
      type,
      name,
      itemCount: 0,
      payload: { name, subject, text, html: trackedHtml },
    };
  }
  if (type === "page") {
    const name = cleanText(body.name, 120);
    const html = cleanHtml(body.html, false);
    if (!name || !html) return null;
    return {
      type,
      name,
      itemCount: 0,
      payload: {
        name,
        html,
        capture_credentials: false,
        capture_passwords: false,
      },
    };
  }
  if (type === "sending_profile") {
    const profile = profilePayload(body);
    if (!profile) return null;
    return { type, ...profile };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!isWorkspaceId(workspaceId))
    return gophishError("Workspace inválido.", 400);
  const access = await requireGophishWorkspaceAccess(request, workspaceId);
  if (access.error) return access.error;

  const workspaceKey = databaseWorkspaceId(workspaceId);
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 15 * 60_000).toISOString();
  const [expired, stale] = await Promise.all([
    access.client
      .from("pierphish_campaign_asset_commands")
      .update({
        status: "expired",
        finished_at: now.toISOString(),
        encrypted_payload: {},
        result_message: "Conector offline durante a janela de despacho.",
      })
      .eq("workspace_id", workspaceKey)
      .eq("status", "queued")
      .lte("dispatch_expires_at", now.toISOString()),
    access.client
      .from("pierphish_campaign_asset_commands")
      .update({
        status: "uncertain",
        finished_at: now.toISOString(),
        encrypted_payload: {},
        result_message:
          "Tempo limite excedido. Confira o ativo no ambiente conectado antes de repetir.",
      })
      .eq("workspace_id", workspaceKey)
      .eq("status", "processing")
      .lt("claimed_at", staleBefore),
  ]);
  if (expired.error || stale.error)
    return gophishError("Não foi possível limpar as operações expiradas.", 502);

  const { data, error } = await access.client
    .from("pierphish_campaign_asset_commands")
    .select(
      "id,asset_type,asset_name,item_count,requested_by_name,status,queued_at,finished_at,remote_asset_id,result_message",
    )
    .eq("workspace_id", workspaceKey)
    .order("queued_at", { ascending: false })
    .limit(50);
  if (error)
    return gophishError(
      "Não foi possível carregar as operações de ativos.",
      502,
    );

  return NextResponse.json(
    {
      operations: (data ?? []).map((row) => ({
        id: row.id,
        type: row.asset_type,
        name: row.asset_name,
        itemCount: row.item_count,
        requestedBy: row.requested_by_name,
        status: row.status,
        queuedAt: row.queued_at,
        finishedAt: row.finished_at,
        assetId: row.remote_asset_id,
        result: row.result_message,
      })),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 1_500_000)
    return gophishError("O formulário excede o limite permitido.", 413);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return gophishError("Formulário inválido.", 400);
  }
  if (!isRecord(body) || !isWorkspaceId(body.workspaceId))
    return gophishError("Workspace inválido.", 400);
  const access = await requireGophishWorkspaceAccess(
    request,
    body.workspaceId,
    true,
  );
  if (access.error) return access.error;

  const asset = buildAsset(body);
  const connectorId = cleanText(body.connectorId, 50);
  if (!asset || !/^[0-9a-f-]{36}$/i.test(connectorId))
    return gophishError("Revise os campos do ativo antes de continuar.", 400);

  const { data: connector, error: connectorError } = await access.client
    .from("pierphish_gophish_connectors")
    .select("id,snapshot,last_seen")
    .eq("id", connectorId)
    .eq("workspace_id", databaseWorkspaceId(body.workspaceId))
    .maybeSingle();
  if (connectorError)
    return gophishError("Não foi possível validar a conexão.", 502);
  if (
    !connector ||
    !connector.last_seen ||
    Date.now() - new Date(connector.last_seen).getTime() >= 90_000
  )
    return gophishError(
      "A conexão de campanhas está offline. Aguarde a reconexão e tente novamente.",
      409,
    );

  const snapshot = isRecord(connector.snapshot) ? connector.snapshot : {};
  const assetListField: Record<AssetType, string> = {
    group: "groups",
    template: "templates",
    page: "pages",
    sending_profile: "sendingProfiles",
  };
  const existingAssets = snapshot[assetListField[asset.type]];
  const duplicateName = Array.isArray(existingAssets)
    ? existingAssets.some(
        (item) =>
          isRecord(item) &&
          cleanText(item.name, 120).toLowerCase() === asset.name.toLowerCase(),
      )
    : false;
  if (duplicateName) {
    const assetLabel = asset.type === "group" ? "grupo" : "ativo";
    return gophishError(
      `Já existe um ${assetLabel} com esse nome na conexão. Escolha outro nome.`,
      409,
    );
  }

  const publicKey =
    typeof snapshot.commandEncryptionKey === "string"
      ? snapshot.commandEncryptionKey
      : "";
  if (!publicKey.startsWith("-----BEGIN PUBLIC KEY-----"))
    return gophishError(
      "Atualize a conexão para preparar uma operação protegida.",
      409,
    );

  let encryptedPayload: ReturnType<typeof encryptForConnector>;
  try {
    encryptedPayload = encryptForConnector(publicKey, asset.payload);
  } catch {
    return gophishError(
      "Não foi possível proteger o conteúdo para a conexão.",
      409,
    );
  }

  const { data: command, error } = await access.client
    .from("pierphish_campaign_asset_commands")
    .insert({
      workspace_id: databaseWorkspaceId(body.workspaceId),
      connector_id: connector.id,
      requested_by: access.userId,
      requested_by_name: access.userLabel,
      asset_type: asset.type,
      asset_name: asset.name,
      item_count: asset.itemCount,
      encrypted_payload: encryptedPayload,
      dispatch_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !command)
    return gophishError("Não foi possível colocar o ativo na fila.", 502);

  return NextResponse.json(
    { commandId: command.id, status: "queued" },
    {
      status: 202,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
