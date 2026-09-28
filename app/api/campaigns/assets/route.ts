import {
  createCipheriv,
  constants,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import { isIP } from "node:net";
import postcss from "postcss";
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
type AssetType =
  "group" | "template" | "page" | "sending_profile" | "campaign_results";

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

const safeCssProperties = new Set([
  "align-content",
  "align-items",
  "align-self",
  "aspect-ratio",
  "background",
  "background-color",
  "background-image",
  "block-size",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "background-position",
  "background-repeat",
  "background-size",
  "bottom",
  "box-shadow",
  "box-sizing",
  "color",
  "column-count",
  "column-gap",
  "columns",
  "content",
  "cursor",
  "direction",
  "display",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font-family",
  "font",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "gap",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-area",
  "grid-column",
  "grid-row",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
  "height",
  "inline-size",
  "inset",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "justify-content",
  "justify-items",
  "justify-self",
  "left",
  "letter-spacing",
  "line-height",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-block-size",
  "max-inline-size",
  "max-width",
  "min-height",
  "min-block-size",
  "min-inline-size",
  "min-width",
  "object-fit",
  "opacity",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "place-content",
  "place-items",
  "place-self",
  "pointer-events",
  "position",
  "right",
  "row-gap",
  "table-layout",
  "text-align",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-indent",
  "text-shadow",
  "text-align-last",
  "text-overflow",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "z-index",
]);

const safeCssValuePattern =
  /^(?!.*(?:url|image(?:-set|-rect)?|cross-fade|element|paint|expression|javascript|behavior|binding)\s*\()(?!.*\\)[\w\s#.,%():/!+\-'\"]{1,500}$/i;

const safeMediaQueryPattern =
  /^(?:(?:all|screen|print)\s+and\s+)?\((?:(?:min|max)-(?:width|height):\s*\d{1,4}(?:px|em|rem)|prefers-color-scheme:\s*(?:dark|light)|prefers-reduced-motion:\s*(?:reduce|no-preference)|orientation:\s*(?:portrait|landscape))\)(?:\s+and\s+\((?:(?:min|max)-(?:width|height):\s*\d{1,4}(?:px|em|rem)|prefers-color-scheme:\s*(?:dark|light)|prefers-reduced-motion:\s*(?:reduce|no-preference)|orientation:\s*(?:portrait|landscape))\))*$/i;

function externalStylesheetUrl(value: string | undefined) {
  if (!value || value.length > 2_048) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !host.includes(".") ||
      isIP(host.replace(/^\[|\]$/g, "")) !== 0 ||
      /\.(?:localhost|local|internal|test|invalid|example)$/i.test(host) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      url.hash
    )
      return null;

    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeCss(source: string) {
  if (source.length > 100_000) return "";

  try {
    const root = postcss.parse(source);
    let ruleCount = 0;

    root.walkAtRules((rule) => {
      const allowedMedia =
        rule.name.toLowerCase() === "media" &&
        safeMediaQueryPattern.test(rule.params.trim());
      const allowedLayer =
        rule.name.toLowerCase() === "layer" &&
        /^[-_a-z][\w.-]*(?:\s*,\s*[-_a-z][\w.-]*)*$/i.test(rule.params.trim());
      if (!allowedMedia && !allowedLayer) rule.remove();
    });

    root.walkRules((rule) => {
      ruleCount += 1;
      if (
        ruleCount > 5_000 ||
        rule.selector.length > 1_000 ||
        /[\u0000-\u001f<>]/.test(rule.selector)
      )
        rule.remove();
    });

    root.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();
      const isSafeCustomProperty = /^--[a-z_][a-z0-9_-]{0,63}$/i.test(property);
      if (
        (!safeCssProperties.has(property) && !isSafeCustomProperty) ||
        !safeCssValuePattern.test(declaration.value)
      )
        declaration.remove();
    });

    root.walkComments((comment) => {
      comment.remove();
    });
    return root.toString().trim();
  } catch {
    return "";
  }
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
  const sourceWithMarkers = allowCampaignUrl
    ? source.replaceAll("{{.URL}}", marker)
    : source;
  const styleBlocks: Array<{ marker: string; css: string }> = [];
  const sourceWithStylesExtracted = sourceWithMarkers.replace(
    /<style\b[^>]*>([\s\S]*?)(?:<\/style\s*>|$)/gi,
    (_match, css: string) => {
      const styleMarker = `PIERSEC_STYLE_${randomBytes(12).toString("hex")}__`;
      styleBlocks.push({ marker: styleMarker, css: sanitizeCss(css) });
      return styleMarker;
    },
  );
  const isLandingPage = !allowCampaignUrl;
  const cleaned = sanitizeHtml(sourceWithStylesExtracted, {
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
      ...(isLandingPage
        ? [
            "article",
            "aside",
            "body",
            "code",
            "dd",
            "dl",
            "dt",
            "figure",
            "figcaption",
            "footer",
            "head",
            "header",
            "h4",
            "h5",
            "h6",
            "html",
            "img",
            "link",
            "main",
            "meta",
            "nav",
            "pre",
            "section",
            "small",
            "title",
          ]
        : []),
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
      "*": ["class", "id", "style"],
      a: ["href", "title", "class", "id", "style"],
      ...(isLandingPage
        ? { link: ["href", "media", "referrerpolicy", "rel"] }
        : {}),
      ...(isLandingPage
        ? {
            img: [
              "alt",
              "class",
              "height",
              "id",
              "loading",
              "referrerpolicy",
              "src",
              "style",
              "width",
            ],
            meta: ["charset", "content", "name"],
          }
        : {}),
      td: ["colspan", "class", "id", "style"],
      th: ["colspan", "class", "id", "style"],
    },
    allowedClasses: {
      "*": [/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/],
    },
    allowedStyles: {
      "*": Object.fromEntries(
        [...safeCssProperties].map((property) => [
          property,
          [safeCssValuePattern],
        ]),
      ),
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: isLandingPage ? { link: ["https"] } : undefined,
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "noopener noreferrer",
        },
      }),
      ...(isLandingPage
        ? {
            link: (_tagName, attributes) => {
              const rel = attributes.rel?.trim().toLowerCase().split(/\s+/);
              const href = rel?.includes("stylesheet")
                ? externalStylesheetUrl(attributes.href)
                : null;
              const media = attributes.media?.trim();

              return {
                tagName: "link",
                attribs: href
                  ? {
                      rel: "stylesheet",
                      href,
                      referrerpolicy: "no-referrer",
                      ...(media && safeMediaQueryPattern.test(media)
                        ? { media }
                        : {}),
                    }
                  : {},
              };
            },
            img: (_tagName, attributes) => {
              const src = externalStylesheetUrl(attributes.src);
              return {
                tagName: "img",
                attribs: src
                  ? { ...attributes, src, referrerpolicy: "no-referrer" }
                  : {},
              };
            },
            meta: (_tagName, attributes) => {
              const name = attributes.name?.trim().toLowerCase();
              const content = attributes.content?.trim();
              const attribs: Record<string, string> = {};
              if (
                name === "viewport" &&
                content &&
                /^[a-z0-9\s=.,;()-]{1,200}$/i.test(content)
              ) {
                attribs.name = "viewport";
                attribs.content = content;
              } else if (
                name === "referrer" &&
                content?.toLowerCase() === "no-referrer"
              ) {
                attribs.name = "referrer";
                attribs.content = "no-referrer";
              } else if (attributes.charset?.trim().toLowerCase() === "utf-8") {
                attribs.charset = "utf-8";
              }
              return { tagName: "meta", attribs };
            },
          }
        : {}),
    },
  });
  const cleanedWithStyles = styleBlocks.reduce(
    (html, { marker: styleMarker, css }) =>
      html.replaceAll(styleMarker, css ? `<style>${css}</style>` : ""),
    cleaned,
  );
  return allowCampaignUrl
    ? cleanedWithStyles.replaceAll(marker, "{{.URL}}")
    : "<!doctype html>" + cleanedWithStyles;
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
  const profileId =
    body.profileId === undefined ? null : Number(body.profileId);
  if (profileId !== null && (!Number.isSafeInteger(profileId) || profileId < 1))
    return null;
  if (profileId !== null) {
    const username = cleanText(body.username, 255);
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !username || !password || password.length > 512) return null;
    return {
      name,
      payload: { id: profileId, name, username, password },
      itemCount: 0,
    };
  }

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
  if (body.action === "read") {
    if (
      type !== "group" &&
      type !== "template" &&
      type !== "page" &&
      type !== "campaign_results"
    )
      return null;
    const id = Number(body.assetId);
    const responsePublicKey =
      typeof body.responsePublicKey === "string"
        ? body.responsePublicKey.trim().slice(0, 2048)
        : "";
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !/^-----BEGIN PUBLIC KEY-----\s+[A-Za-z0-9+/=\s]+-----END PUBLIC KEY-----$/.test(
        responsePublicKey,
      )
    )
      return null;
    return {
      type,
      name: "",
      itemCount: 0,
      payload: { action: "read", id, responsePublicKey },
    };
  }
  const assetId = body.assetId === undefined ? null : Number(body.assetId);
  if (assetId !== null && (!Number.isSafeInteger(assetId) || assetId < 1))
    return null;
  const id = assetId ?? undefined;
  if (type === "group") {
    const name = cleanText(body.name, 120);
    const targets = normalizeTargets(body.targets);
    if (!name || !targets) return null;
    return {
      type,
      name,
      itemCount: targets.length,
      payload: { ...(id ? { id } : {}), name, targets },
    };
  }
  if (type === "template") {
    const name = cleanText(body.name, 120);
    const subject = cleanText(body.subject, 200);
    const text = cleanBodyText(body.text, 100_000);
    const html = cleanHtml(body.html, true);
    if (!name || !subject || html === null || (!text && !html)) return null;
    const hasTrackingPixel =
      /<img\b[^>]*\bsrc\s*=\s*["'][^"']*\{\{\.Tracker\}\}[^"']*["'][^>]*>/i.test(
        html,
      );
    const trackedHtml =
      html && !hasTrackingPixel
        ? `${html}<img src="{{.Tracker}}" alt="" width="1" height="1" />`
        : html;
    return {
      type,
      name,
      itemCount: 0,
      payload: {
        ...(id ? { id } : {}),
        name,
        subject,
        text,
        html: trackedHtml,
      },
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
        ...(id ? { id } : {}),
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
  const encryptedResultBefore = new Date(
    now.getTime() - 30 * 60_000,
  ).toISOString();
  const [expired, stale, expiredEncryptedResults] = await Promise.all([
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
    access.client
      .from("pierphish_campaign_asset_commands")
      .update({ encrypted_result: {} })
      .eq("workspace_id", workspaceKey)
      .eq("status", "succeeded")
      .lt("finished_at", encryptedResultBefore)
      .not("encrypted_result", "is", null)
      .neq("encrypted_result", "{}"),
  ]);
  if (expired.error || stale.error || expiredEncryptedResults.error)
    return gophishError("Não foi possível limpar as operações expiradas.", 502);

  const { data, error } = await access.client
    .from("pierphish_campaign_asset_commands")
    .select(
      "id,asset_type,asset_name,item_count,requested_by_name,status,queued_at,finished_at,remote_asset_id,result_message,encrypted_result",
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
        encryptedResult:
          isRecord(row.encrypted_result) &&
          typeof row.encrypted_result.ciphertext === "string"
            ? row.encrypted_result
            : null,
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

  if (body.action === "ack") {
    const commandId = cleanText(body.commandId, 36);
    if (!/^[0-9a-f-]{36}$/i.test(commandId))
      return gophishError("Operação inválida.", 400);
    const { error } = await access.client
      .from("pierphish_campaign_asset_commands")
      .update({ encrypted_result: {} })
      .eq("id", commandId)
      .eq("workspace_id", databaseWorkspaceId(body.workspaceId))
      .eq("requested_by", access.userId)
      .eq("status", "succeeded");
    if (error)
      return gophishError("Não foi possível limpar a resposta protegida.", 502);
    return NextResponse.json(
      { accepted: true },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

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
    campaign_results: "campaigns",
  };
  const existingAssets = snapshot[assetListField[asset.type]];
  const isRead = asset.payload.action === "read";
  const targetAssetId =
    asset.type !== "sending_profile" &&
    asset.type !== "campaign_results" &&
    Number.isSafeInteger(asset.payload.id)
      ? Number(asset.payload.id)
      : null;
  const updateProfileId =
    asset.type === "sending_profile" &&
    isRecord(asset.payload) &&
    Number.isSafeInteger(asset.payload.id)
      ? Number(asset.payload.id)
      : null;
  const existingProfiles = Array.isArray(existingAssets)
    ? existingAssets.filter(isRecord)
    : [];
  if (isRead) {
    const selected = existingProfiles.find(
      (item) => Number(item.id) === Number(asset.payload.id),
    );
    if (selected) asset.name = cleanText(selected.name, 120);
  }
  const features = isRecord(snapshot.capabilities) ? snapshot.capabilities : {};
  if (
    (updateProfileId !== null && features.profileUpdates !== true) ||
    (targetAssetId !== null && !isRead && features.assetEdits !== true) ||
    (isRead &&
      asset.type !== "campaign_results" &&
      features.assetEdits !== true) ||
    (asset.type === "campaign_results" && features.individualResults !== true)
  )
    return gophishError(
      "Atualize a Stack do conector no Portainer para habilitar esta operação. Nenhuma alteração foi enviada.",
      409,
    );
  if (
    (targetAssetId !== null || isRead) &&
    !existingProfiles.some(
      (item) => Number(item.id) === Number(asset.payload.id),
    )
  )
    return gophishError(
      "O item não está mais disponível. Atualize a lista e tente novamente.",
      409,
    );
  if (
    updateProfileId !== null &&
    !existingProfiles.some((profile) => Number(profile.id) === updateProfileId)
  )
    return gophishError(
      "O perfil não está mais disponível. Atualize a lista e tente novamente.",
      409,
    );
  if (updateProfileId !== null) {
    const currentProfile = existingProfiles.find(
      (profile) => Number(profile.id) === updateProfileId,
    );
    if (currentProfile) {
      asset.name = cleanText(currentProfile.name, 120);
      if (isRecord(asset.payload)) asset.payload.name = asset.name;
    }
  }
  const duplicateName =
    !isRead && Array.isArray(existingAssets)
      ? existingAssets.some(
          (item) =>
            isRecord(item) &&
            Number(item.id) !== (updateProfileId ?? targetAssetId) &&
            cleanText(item.name, 120).toLowerCase() ===
              asset.name.toLowerCase(),
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
