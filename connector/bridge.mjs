import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import path from "node:path";

const dataDirectory = process.env.DATA_DIR || "/data";
const configurationPath = path.join(dataDirectory, "connection.json");
const commandPrivateKeyPath = path.join(dataDirectory, "command-private.pem");
const commandPublicKeyPath = path.join(dataDirectory, "command-public.pem");
let commandPrivateKey;
const campaignServiceUrl = process.env.CAMPAIGN_SERVICE_URL;
const piersecUrl = process.env.PIERSEC_URL;
const apiKeyFile =
  process.env.CAMPAIGN_API_KEY_FILE || "/run/secrets/campaign_api_key";
const caFile =
  process.env.CAMPAIGN_CA_FILE || "/run/secrets/campaign_admin_certificate";
const maximumResponseBytes = 12 * 1024 * 1024;
const pollIntervalMs = 30_000;

function requireHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(label + " precisa ser uma URL HTTPS válida.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      label + " precisa ser uma URL HTTPS sem credenciais ou parâmetros.",
    );
  }
  return parsed;
}

function serviceAgent(ca) {
  const serverName = process.env.CAMPAIGN_TLS_SERVER_NAME || undefined;
  return new https.Agent({
    ca,
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
    checkServerIdentity: (hostname, certificate) =>
      tls.checkServerIdentity(serverName || hostname, certificate),
  });
}

function requestJson(baseUrl, pathname, options = {}) {
  const base = requireHttpsUrl(baseUrl, "Endereço privado do serviço");
  const target = new URL(
    pathname.replace(/^\//, ""),
    base.href.endsWith("/") ? base : base.href + "/",
  );
  if (target.origin !== base.origin || target.protocol !== "https:") {
    return Promise.reject(new Error("O conector bloqueou um destino externo."));
  }

  const headers = { Accept: "application/json" };
  if (options.apiKey) headers.Authorization = options.apiKey;
  let requestBody;
  if (options.body !== undefined) {
    requestBody = Buffer.from(JSON.stringify(options.body));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(requestBody.byteLength);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      target,
      {
        method: options.method || "GET",
        headers,
        agent: options.agent,
        timeout: 15_000,
        maxHeaderSize: 16 * 1024,
      },
      (res) => {
        const chunks = [];
        let receivedBytes = 0;
        res.on("data", (chunk) => {
          receivedBytes += chunk.byteLength;
          if (receivedBytes > maximumResponseBytes) {
            req.destroy(new Error("Resposta acima do limite permitido."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let body = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            const contentType = String(
              res.headers["content-type"] || "desconhecido",
            ).slice(0, 100);
            reject(
              new Error(
                "O serviço retornou uma resposta inválida em " +
                  target.pathname +
                  " (HTTP " +
                  (res.statusCode || 0) +
                  "; " +
                  contentType +
                  ").",
              ),
            );
            return;
          }
          resolve({ status: res.statusCode || 0, body });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Tempo limite de conexão.")));
    req.on("error", reject);
    if (requestBody) req.write(requestBody);
    req.end();
  });
}

function piersecRequest(pathname, options = {}) {
  const base = requireHttpsUrl(piersecUrl, "Endereço do Piersec");
  const target = new URL(pathname, base);
  if (target.origin !== base.origin)
    throw new Error("O conector bloqueou um destino externo.");
  const headers = { Accept: "application/json" };
  if (options.token) headers.Authorization = "Bearer " + options.token;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(target, {
    method: options.method || "POST",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  }).then(async (response) => {
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  });
}

function apiPathAllowed(method, pathname) {
  if (method === "POST")
    return /^api\/(campaigns|groups|templates|pages|smtp)\/?$/.test(pathname);
  if (method === "PUT")
    return /^api\/(groups|templates|pages|smtp)\/[1-9][0-9]*\/?$/.test(
      pathname,
    );
  return (
    /^api\/(campaigns|groups|templates|pages|smtp)(\/summary)?\/?$/.test(
      pathname,
    ) ||
    /^api\/campaigns\/[0-9]+\/summary\/?$/.test(pathname) ||
    /^api\/campaigns\/[1-9][0-9]*\/results\/?$/.test(pathname) ||
    /^api\/(groups|templates|pages)\/[1-9][0-9]*\/?$/.test(pathname) ||
    /^api\/smtp\/[1-9][0-9]*\/?$/.test(pathname)
  );
}

async function loadOrCreateCommandKeys() {
  try {
    const [privateKey, publicKey] = await Promise.all([
      readFile(commandPrivateKeyPath, "utf8"),
      readFile(commandPublicKeyPath, "utf8"),
    ]);
    return { privateKey, publicKey };
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw new Error("Não foi possível ler as chaves protegidas da fila.");
  }

  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  await writeFile(commandPrivateKeyPath, pair.privateKey, { mode: 0o600 });
  await writeFile(commandPublicKeyPath, pair.publicKey, { mode: 0o600 });
  return pair;
}

async function serviceRequest(pathname, apiKey, agent, options = {}) {
  const method = options.method || "GET";
  if (!apiPathAllowed(method, pathname))
    throw new Error("Endpoint não permitido pelo conector.");
  const result = await requestJson(campaignServiceUrl, pathname, {
    method,
    apiKey,
    agent,
    body: options.body,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error("O serviço respondeu HTTP " + result.status + ".");
  }
  return result.body;
}

function text(value, limit = 160) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function count(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0
    ? Math.min(number, 1_000_000_000)
    : 0;
}

function deliveryErrorText(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return text(parsed.error || parsed.message, 1000).toLowerCase();
      }
    } catch {
      return text(value, 1000).toLowerCase();
    }
  }
  if (value && typeof value === "object") {
    return text(value.error || value.message, 1000).toLowerCase();
  }
  return "";
}

function deliveryErrorCode(error) {
  if (
    /\b535\b|5\.7\.8|authenticat|invalid credentials|username.*password/.test(
      error,
    )
  ) {
    return "smtp_auth";
  }
  if (
    /invalid address|unknown recipient|unknown user|mailbox.*(unavailable|unknown|not found)|5\.1\.1/.test(
      error,
    )
  ) {
    return "invalid_recipient";
  }
  if (
    /timed? ?out|timeout|deadline exceeded|connection refused|dial tcp|no such host|network is unreachable|tls|certificate|broken pipe/.test(
      error,
    )
  ) {
    return "smtp_connection";
  }
  if (/\b4\d\d\b|\b4\.\d\.\d\b|rate.?limit|too many messages/.test(error)) {
    return "smtp_temporary";
  }
  if (/\b5\d\d\b|\b5\.\d\.\d\b/.test(error)) {
    return "smtp_rejected";
  }
  return "other";
}

function campaignDeliveryIssues(campaign, errorCount) {
  if (!errorCount) return {};
  const issueCounts = {};
  const events = Array.isArray(campaign?.timeline) ? campaign.timeline : [];
  for (const event of events) {
    const message = text(event?.message, 120);
    if (!/email.*(error|fail|reject)|(error|fail|reject).*email/i.test(message))
      continue;
    const code = deliveryErrorCode(deliveryErrorText(event?.details));
    issueCounts[code] = count(issueCounts[code]) + 1;
  }

  let remaining = errorCount;
  const bounded = {};
  for (const code of [
    "smtp_auth",
    "invalid_recipient",
    "smtp_connection",
    "smtp_temporary",
    "smtp_rejected",
    "other",
  ]) {
    const observed = Math.min(count(issueCounts[code]), remaining);
    if (observed) bounded[code] = observed;
    remaining -= observed;
  }
  if (remaining) bounded.other = count(bounded.other) + remaining;
  return bounded;
}

function groupSummaryItems(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" && !Array.isArray(value)
    ? Array.isArray(value.groups)
      ? value.groups
      : []
    : [];
}

function safeAsset(item, extra = {}) {
  return {
    id: count(item?.id),
    name: text(item?.name),
    modifiedDate: text(item?.modified_date, 50),
    ...extra,
  };
}

function hasTrackedCampaignLink(template) {
  const html = typeof template?.html === "string" ? template.html : "";
  const textBody = typeof template?.text === "string" ? template.text : "";
  return (
    /<a\b[^>]*\bhref\s*=\s*["']\s*\{\{\.URL\}\}\s*["']/i.test(html) ||
    /\{\{\.URL\}\}/i.test(textBody)
  );
}

async function readSnapshot(apiKey, agent, commandEncryptionKey) {
  const [rawCampaigns, rawGroups, rawTemplates, rawPages, rawProfiles] =
    await Promise.all([
      serviceRequest("api/campaigns/", apiKey, agent),
      serviceRequest("api/groups/summary", apiKey, agent),
      serviceRequest("api/templates/", apiKey, agent),
      serviceRequest("api/pages/", apiKey, agent),
      serviceRequest("api/smtp/", apiKey, agent),
    ]);

  const campaigns = [];
  for (const item of Array.isArray(rawCampaigns)
    ? rawCampaigns.slice(0, 2000)
    : []) {
    const summary = await serviceRequest(
      "api/campaigns/" + count(item?.id) + "/summary",
      apiKey,
      agent,
    );
    const stats = summary?.stats || {};
    const deliveryErrors = count(stats.error);
    campaigns.push({
      id: count(item?.id),
      name: text(item?.name),
      status: text(item?.status, 80),
      createdAt: text(item?.created_date, 50),
      launchAt: text(item?.launch_date, 50),
      completedAt: text(item?.completed_date, 50),
      template: text(item?.template?.name),
      page: text(item?.page?.name),
      groups: Array.isArray(item?.groups)
        ? item.groups
            .slice(0, 100)
            .map((group) => text(group?.name))
            .filter(Boolean)
        : [],
      stats: {
        total: count(stats.total),
        sent: count(stats.sent),
        opened: count(stats.opened),
        clicked: count(stats.clicked),
        submittedData: count(stats.submitted_data),
        emailReported: count(stats.email_reported),
        error: deliveryErrors,
      },
      deliveryIssues: campaignDeliveryIssues(item, deliveryErrors),
    });
  }

  return {
    updatedAt: new Date().toISOString(),
    commandEncryptionKey,
    capabilities: {
      profileUpdates: true,
      assetEdits: true,
      individualResults: true,
      clickTrackingCheck: true,
    },
    campaigns,
    groups: groupSummaryItems(rawGroups)
      .slice(0, 2000)
      .map((group) =>
        safeAsset(group, { numTargets: count(group?.num_targets) }),
      ),
    templates: (Array.isArray(rawTemplates) ? rawTemplates : [])
      .slice(0, 2000)
      .map((item) =>
        safeAsset(item, { tracksClicks: hasTrackedCampaignLink(item) }),
      ),
    pages: (Array.isArray(rawPages) ? rawPages : [])
      .slice(0, 2000)
      .map((item) =>
        safeAsset(item, {
          captureCredentials:
            typeof item?.capture_credentials === "boolean"
              ? item.capture_credentials
              : null,
          capturePasswords:
            typeof item?.capture_passwords === "boolean"
              ? item.capture_passwords
              : null,
        }),
      ),
    sendingProfiles: (Array.isArray(rawProfiles) ? rawProfiles : [])
      .slice(0, 2000)
      .map((item) => safeAsset(item)),
  };
}

async function saveConfiguration(configuration) {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  await writeFile(configurationPath, JSON.stringify(configuration), {
    mode: 0o600,
  });
}

async function pairIfNeeded(agent, apiKey, commandEncryptionKey) {
  try {
    const configuration = JSON.parse(await readFile(configurationPath, "utf8"));
    return configuration;
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw new Error(
        "Não foi possível ler a configuração protegida do conector.",
      );
  }

  const pairingCode = text(process.env.PIERSEC_PAIRING_CODE, 100);
  if (!pairingCode)
    throw new Error(
      "Gere um código temporário na página Conexão e configure a Stack no Portainer.",
    );

  await readSnapshot(apiKey, agent, commandEncryptionKey);
  const enrollment = await piersecRequest("/api/campaigns/connection/enroll", {
    body: { pairingCode },
  });
  if (
    enrollment.status < 200 ||
    enrollment.status >= 300 ||
    typeof enrollment.body?.connectorToken !== "string"
  ) {
    throw new Error(
      "O pareamento não foi concluído. Gere um novo código e tente novamente.",
    );
  }

  const configuration = {
    version: 1,
    piersecUrl: requireHttpsUrl(piersecUrl, "Endereço do Piersec").origin,
    serviceUrl: requireHttpsUrl(
      campaignServiceUrl,
      "Endereço privado do serviço",
    ).origin,
    connectorToken: enrollment.body.connectorToken,
    pairedAt: new Date().toISOString(),
  };
  await saveConfiguration(configuration);
  console.log(
    "Conexão pareada. Remova o código temporário da Stack no Portainer.",
  );
  return configuration;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameAsset(current, expected, label) {
  if (
    !expected ||
    !current ||
    Number(current.id) !== Number(expected.id) ||
    current.name !== expected.name ||
    current.modifiedDate !== expected.modifiedDate
  ) {
    throw new Error(label + " mudou desde a revisão. Prepare uma nova prévia.");
  }
}

async function createConfirmedCampaign(apiKey, agent, payload) {
  if (!isRecord(payload?.campaign) || !isRecord(payload?.selected))
    throw new Error("A ordem não contém uma campanha confirmada válida.");
  const selected = payload.selected;
  const [groups, templates, pages, profiles] = await Promise.all([
    serviceRequest("api/groups/summary", apiKey, agent),
    serviceRequest("api/templates/", apiKey, agent),
    serviceRequest("api/pages/", apiKey, agent),
    serviceRequest("api/smtp/", apiKey, agent),
  ]);

  const currentGroups = groupSummaryItems(groups);
  for (const expected of Array.isArray(selected.groups)
    ? selected.groups
    : []) {
    const current = currentGroups.find(
      (group) => Number(group?.id) === Number(expected.id),
    );
    sameAsset(
      current && safeAsset(current),
      expected,
      "O grupo " + text(expected.name),
    );
    if (count(current.num_targets) !== count(expected.numTargets))
      throw new Error(
        "A quantidade de pessoas do grupo mudou. Prepare uma nova prévia.",
      );
  }

  const template = (Array.isArray(templates) ? templates : []).find(
    (item) => Number(item?.id) === Number(selected.template?.id),
  );
  const page = (Array.isArray(pages) ? pages : []).find(
    (item) => Number(item?.id) === Number(selected.page?.id),
  );
  const profile = (Array.isArray(profiles) ? profiles : []).find(
    (item) => Number(item?.id) === Number(selected.sendingProfile?.id),
  );
  sameAsset(template && safeAsset(template), selected.template, "O modelo");
  sameAsset(
    page &&
      safeAsset(page, {
        captureCredentials:
          typeof page.capture_credentials === "boolean"
            ? page.capture_credentials
            : null,
        capturePasswords:
          typeof page.capture_passwords === "boolean"
            ? page.capture_passwords
            : null,
      }),
    selected.page,
    "A página de destino",
  );
  sameAsset(
    profile && safeAsset(profile),
    selected.sendingProfile,
    "O perfil de envio",
  );
  if (page.capture_credentials !== false || page.capture_passwords !== false) {
    throw new Error(
      "A página não confirmou a ausência de captura de credenciais. O envio foi bloqueado.",
    );
  }

  const requested = payload.campaign;
  const destination = new URL(String(requested.url || ""));
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password
  )
    throw new Error("A URL da campanha precisa usar HTTPS.");
  if (text(requested.name, 120) !== text(selected.campaignName, 120))
    throw new Error("O nome não corresponde à campanha revisada.");

  const campaign = {
    name: text(requested.name, 120),
    template: { name: template.name },
    page: { name: page.name },
    smtp: { name: profile.name },
    url: destination.href,
    groups: selected.groups.map((group) => ({ name: text(group.name) })),
  };
  if (requested.launch_date) {
    const launch = Date.parse(requested.launch_date);
    if (!Number.isFinite(launch) || launch <= Date.now())
      throw new Error("O horário agendado já passou. Prepare uma nova prévia.");
    campaign.launch_date = new Date(launch).toISOString();
  }
  if (requested.send_by_date) {
    const sendBy = Date.parse(requested.send_by_date);
    if (
      !requested.launch_date ||
      !Number.isFinite(sendBy) ||
      sendBy <= Date.parse(requested.launch_date)
    )
      throw new Error("O prazo final precisa ser posterior ao início.");
    campaign.send_by_date = new Date(sendBy).toISOString();
  }

  let response;
  try {
    response = await requestJson(campaignServiceUrl, "api/campaigns/", {
      method: "POST",
      apiKey,
      agent,
      body: campaign,
    });
  } catch {
    return {
      status: "uncertain",
      campaignId: null,
      message:
        "A resposta foi interrompida. Confira o painel do serviço antes de repetir a ação.",
    };
  }
  if (response.status >= 500)
    return {
      status: "uncertain",
      campaignId: null,
      message:
        "O serviço retornou erro ao receber a ordem. Confira o painel antes de qualquer nova tentativa.",
    };
  if (response.status < 200 || response.status >= 300)
    return {
      status: "failed",
      campaignId: null,
      message: "O serviço recusou a campanha com HTTP " + response.status + ".",
    };
  const campaignId = count(response.body?.id);
  if (!campaignId)
    return {
      status: "uncertain",
      campaignId: null,
      message:
        "A resposta não trouxe um recibo válido. Confira o painel antes de repetir a ação.",
    };
  return { status: "succeeded", campaignId, message: "Campanha registrada." };
}

function decryptCommandPayload(envelope, privateKey) {
  if (
    !envelope ||
    envelope.version !== 1 ||
    typeof envelope.wrappedKey !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string" ||
    envelope.wrappedKey.length > 1000 ||
    envelope.iv.length > 64 ||
    envelope.ciphertext.length > 2_000_000
  )
    throw new Error("O comando protegido tem formato inválido.");

  const key = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(envelope.wrappedKey, "base64"),
  );
  const iv = Buffer.from(envelope.iv, "base64");
  const ciphertextAndTag = Buffer.from(envelope.ciphertext, "base64");
  if (
    key.byteLength !== 32 ||
    iv.byteLength !== 12 ||
    ciphertextAndTag.byteLength < 17
  ) {
    key.fill(0);
    throw new Error("O comando protegido tem formato inválido.");
  }
  const ciphertext = ciphertextAndTag.subarray(0, -16);
  const tag = ciphertextAndTag.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } finally {
    key.fill(0);
  }
  try {
    return JSON.parse(plaintext.toString("utf8"));
  } finally {
    plaintext.fill(0);
  }
}

function validateAssetCommand(type, payload) {
  if (!isRecord(payload)) throw new Error("O ativo protegido está inválido.");
  const name = text(payload.name, 120);
  if (!name) throw new Error("Informe um nome válido para o ativo.");

  if (type === "group") {
    if (
      !Array.isArray(payload.targets) ||
      payload.targets.length < 1 ||
      payload.targets.length > 500
    )
      throw new Error("O público precisa ter de 1 a 500 destinatários.");
    const seen = new Set();
    const targets = payload.targets.map((target) => {
      if (!isRecord(target)) throw new Error("Um destinatário está inválido.");
      const email = text(target.email, 320).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || seen.has(email))
        throw new Error("Revise os e-mails e remova endereços duplicados.");
      seen.add(email);
      return {
        email,
        first_name: text(target.first_name, 100),
        last_name: text(target.last_name, 100),
        position: text(target.position, 120),
      };
    });
    const id = payload.id === undefined ? null : Number(payload.id);
    if (id !== null && (!Number.isSafeInteger(id) || id < 1))
      throw new Error("O grupo selecionado está inválido.");
    return {
      name,
      body: { ...(id ? { id } : {}), name, targets },
      method: id ? "PUT" : "POST",
      endpoint: id ? "api/groups/" + id : "api/groups/",
    };
  }

  if (type === "template") {
    const subject = text(payload.subject, 200);
    const textBody =
      typeof payload.text === "string" ? payload.text.slice(0, 100_000) : "";
    const html =
      typeof payload.html === "string" ? payload.html.slice(0, 200_000) : "";
    if (
      !subject ||
      (!textBody && !html) ||
      /<\s*(script|form|input|iframe)\b/i.test(html)
    )
      throw new Error("O modelo está incompleto ou contém conteúdo bloqueado.");
    const id = payload.id === undefined ? null : Number(payload.id);
    if (id !== null && (!Number.isSafeInteger(id) || id < 1))
      throw new Error("O modelo selecionado está inválido.");
    return {
      name,
      body: { ...(id ? { id } : {}), name, subject, text: textBody, html },
      method: id ? "PUT" : "POST",
      endpoint: id ? "api/templates/" + id : "api/templates/",
    };
  }

  if (type === "page") {
    const html =
      typeof payload.html === "string" ? payload.html.slice(0, 200_000) : "";
    if (
      !html.trim() ||
      /<\s*(form|input|button|textarea|select|script|iframe)\b/i.test(html)
    )
      throw new Error(
        "A página está vazia ou contém campos de entrada bloqueados.",
      );
    const id = payload.id === undefined ? null : Number(payload.id);
    if (id !== null && (!Number.isSafeInteger(id) || id < 1))
      throw new Error("A página selecionada está inválida.");
    return {
      name,
      body: {
        ...(id ? { id } : {}),
        name,
        html,
        capture_credentials: false,
        capture_passwords: false,
      },
      method: id ? "PUT" : "POST",
      endpoint: id ? "api/pages/" + id : "api/pages/",
    };
  }

  if (type === "sending_profile") {
    const profileId = payload.id === undefined ? null : Number(payload.id);
    if (profileId !== null) {
      const username = text(payload.username, 255);
      const password =
        typeof payload.password === "string" ? payload.password : "";
      if (
        !Number.isSafeInteger(profileId) ||
        profileId < 1 ||
        !username ||
        !password ||
        password.length > 512
      )
        throw new Error("Informe o usuário e a senha do perfil de envio.");
      return {
        name,
        method: "PUT",
        profileId,
        username,
        password,
        endpoint: "api/smtp/" + profileId,
      };
    }

    const host = text(payload.host, 255);
    const fromAddress = text(payload.from_address, 254);
    const username = text(payload.username, 255);
    const password =
      typeof payload.password === "string" ? payload.password : "";
    if (
      !/^[A-Za-z0-9.-]+:\d{1,5}$/.test(host) ||
      !/^(?:[^<>]{1,100}\s*<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(
        fromAddress,
      ) ||
      Boolean(username) !== Boolean(password) ||
      password.length > 512 ||
      payload.ignore_cert_errors !== false
    )
      throw new Error("O perfil de envio contém campos inválidos.");
    const port = Number(host.slice(host.lastIndexOf(":") + 1));
    if (port < 1 || port > 65535)
      throw new Error("A porta do servidor de e-mail é inválida.");
    return {
      name,
      body: {
        name,
        host,
        from_address: fromAddress,
        interface_type: "SMTP",
        username,
        password,
        ignore_cert_errors: false,
      },
      method: "POST",
      endpoint: "api/smtp/",
    };
  }
  throw new Error("Tipo de ativo não permitido.");
}

function encryptForBrowser(publicKey, value) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
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
    ciphertext: ciphertext.toString("base64"),
  };
}

function campaignRecipientActivity(campaign) {
  const recipients = new Map();
  const eventKind = (value) => {
    const normalized = text(value, 100)
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/click.*link|link.*click/.test(normalized)) return "clicked";
    if (/open.*email|email.*open/.test(normalized)) return "opened";
    if (/submit.*data|data.*submit/.test(normalized)) return "submitted";
    if (/report.*email|email.*report/.test(normalized)) return "reported";
    if (/error|fail|reject/.test(normalized)) return "failed";
    if (/send.*email|email.*send/.test(normalized)) return "sent";
    return "";
  };
  const ensureRecipient = (value) => {
    const email = text(value?.email, 320).toLowerCase();
    if (!email) return null;
    if (!recipients.has(email)) {
      recipients.set(email, {
        email,
        firstName: text(value?.first_name, 100),
        lastName: text(value?.last_name, 100),
        position: text(value?.position, 120),
        status: text(value?.status, 80),
        sentAt: text(value?.send_date, 50),
        openedAt: "",
        clickedAt: "",
        submittedAt: "",
        reportedAt: "",
        failedAt: "",
      });
    }
    const target = recipients.get(email);
    if (!target.firstName) target.firstName = text(value?.first_name, 100);
    if (!target.lastName) target.lastName = text(value?.last_name, 100);
    if (!target.position) target.position = text(value?.position, 120);
    if (value?.status) target.status = text(value.status, 80);
    if (value?.send_date) target.sentAt = text(value.send_date, 50);
    const status = eventKind(value?.status);
    const modifiedAt = text(value?.modified_date, 50);
    if (status === "opened") target.openedAt ||= modifiedAt;
    else if (status === "clicked") target.clickedAt ||= modifiedAt;
    else if (status === "submitted") target.submittedAt ||= modifiedAt;
    else if (status === "reported") target.reportedAt ||= modifiedAt;
    else if (status === "failed") target.failedAt ||= modifiedAt;
    return target;
  };

  for (const item of Array.isArray(campaign?.results)
    ? campaign.results.slice(0, 1000)
    : [])
    ensureRecipient(item);

  for (const event of Array.isArray(campaign?.timeline)
    ? campaign.timeline.slice(0, 10_000)
    : []) {
    const target = ensureRecipient({ email: event?.email });
    if (!target) continue;
    const message = eventKind(event?.message);
    const time = text(event?.time, 50);
    if (message === "sent") target.sentAt ||= time;
    else if (message === "opened") target.openedAt ||= time;
    else if (message === "clicked") target.clickedAt ||= time;
    else if (message === "submitted") target.submittedAt ||= time;
    else if (message === "reported") target.reportedAt ||= time;
    else if (message === "failed") target.failedAt ||= time;
  }

  return {
    recipients: [...recipients.values()].slice(0, 500),
    truncated: recipients.size > 500,
  };
}

async function readCampaignAsset(apiKey, agent, type, payload) {
  const id = Number(payload.id);
  const responsePublicKey = text(payload.responsePublicKey, 2048);
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !responsePublicKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
    !responsePublicKey.includes("-----END PUBLIC KEY-----")
  )
    throw new Error("A solicitação de leitura protegida está inválida.");

  const endpoints = {
    group: "api/groups/" + id,
    template: "api/templates/" + id,
    page: "api/pages/" + id,
    campaign_results: "api/campaigns/" + id + "/results",
  };
  if (!endpoints[type]) throw new Error("Tipo de leitura não permitido.");
  const remote = await serviceRequest(endpoints[type], apiKey, agent);
  let result;

  if (type === "group") {
    if (!Array.isArray(remote?.targets) || remote.targets.length > 500)
      throw new Error(
        "Este grupo excede o limite de 500 destinatários para edição no PierSec.",
      );
    result = {
      id,
      name: text(remote.name, 120),
      targets: remote.targets.map((target) => ({
        email: text(target?.email, 320),
        firstName: text(target?.first_name, 100),
        lastName: text(target?.last_name, 100),
        position: text(target?.position, 120),
      })),
    };
  } else if (type === "template") {
    result = {
      id,
      name: text(remote?.name, 120),
      subject: text(remote?.subject, 200),
      text:
        typeof remote?.text === "string" ? remote.text.slice(0, 100_000) : "",
      html:
        typeof remote?.html === "string" ? remote.html.slice(0, 200_000) : "",
    };
  } else if (type === "page") {
    result = {
      id,
      name: text(remote?.name, 120),
      html:
        typeof remote?.html === "string" ? remote.html.slice(0, 200_000) : "",
    };
  } else {
    const activity = campaignRecipientActivity(remote);
    result = {
      id,
      name: text(remote?.name, 120),
      status: text(remote?.status, 80),
      recipients: activity.recipients,
      truncated: activity.truncated,
    };
  }

  return {
    status: "succeeded",
    assetId: id,
    message:
      type === "campaign_results"
        ? "Atividade individual atualizada."
        : "Conteúdo carregado para edição.",
    encryptedResult: encryptForBrowser(responsePublicKey, result),
  };
}

async function createCampaignAsset(apiKey, agent, type, encryptedPayload) {
  const requested = decryptCommandPayload(encryptedPayload, commandPrivateKey);
  if (isRecord(requested) && requested.action === "read")
    return await readCampaignAsset(apiKey, agent, type, requested);
  const payload = validateAssetCommand(type, requested);
  const method = payload.method || "POST";
  if (!apiPathAllowed(method, payload.endpoint))
    throw new Error("Endpoint não permitido pelo conector.");

  let body = payload.body;
  if (method === "PUT") {
    let current;
    try {
      current = await requestJson(campaignServiceUrl, payload.endpoint, {
        method: "GET",
        apiKey,
        agent,
      });
    } catch {
      return {
        status: "failed",
        assetId: null,
        message:
          "Não foi possível consultar o ativo atual. Nenhuma alteração foi aplicada.",
      };
    }
    const currentAsset = current.body;
    if (
      current.status < 200 ||
      current.status >= 300 ||
      !isRecord(currentAsset) ||
      count(currentAsset.id) !== count(payload.profileId ?? payload.body?.id) ||
      !text(currentAsset.name, 120)
    )
      return {
        status: "failed",
        assetId: null,
        message:
          "Não foi possível validar o ativo atual. Nenhuma alteração foi aplicada.",
      };

    if (type === "sending_profile") {
      if (
        !text(currentAsset.host, 255) ||
        !text(currentAsset.from_address, 254)
      )
        return {
          status: "failed",
          assetId: null,
          message:
            "Não foi possível validar o ativo atual. Nenhuma alteração foi aplicada.",
        };
      body = {
        id: payload.profileId,
        name: text(currentAsset.name, 120),
        host: text(currentAsset.host, 255),
        from_address: text(currentAsset.from_address, 254),
        interface_type: "SMTP",
        username: payload.username,
        password: payload.password,
        ignore_cert_errors: currentAsset.ignore_cert_errors === true,
        ...(Array.isArray(currentAsset.headers)
          ? { headers: currentAsset.headers }
          : {}),
      };
    } else if (type === "template") {
      body = {
        ...currentAsset,
        ...payload.body,
        id: count(payload.body?.id),
        attachments: Array.isArray(currentAsset.attachments)
          ? currentAsset.attachments
          : [],
      };
    } else if (type === "page") {
      body = {
        ...currentAsset,
        ...payload.body,
        id: count(payload.body?.id),
        capture_credentials: false,
        capture_passwords: false,
      };
    } else {
      body = { ...payload.body, id: count(payload.body?.id) };
    }
  }

  let response;
  try {
    response = await requestJson(campaignServiceUrl, payload.endpoint, {
      method,
      apiKey,
      agent,
      body,
    });
  } catch {
    return {
      status: "uncertain",
      assetId: null,
      message:
        method === "PUT"
          ? "Não foi possível confirmar a atualização. Confira o perfil antes de tentar novamente."
          : "A resposta foi interrompida. Confira o ativo no ambiente antes de repetir.",
    };
  }
  if (response.status >= 500)
    return {
      status: "uncertain",
      assetId: null,
      message:
        method === "PUT"
          ? "O ambiente retornou erro. Confira se o perfil foi atualizado antes de repetir."
          : "O ambiente retornou erro. Confira se o ativo foi criado antes de repetir.",
    };
  if (response.status < 200 || response.status >= 300)
    return {
      status: "failed",
      assetId: null,
      message:
        response.status === 409 && type === "group"
          ? "Já existe um grupo com esse nome no ambiente conectado. Atualize a lista e escolha outro nome."
          : response.status === 404 && method === "PUT"
            ? "O perfil não foi encontrado no ambiente. Atualize a lista antes de tentar novamente."
            : response.status === 409
              ? "O ambiente encontrou um conflito ao criar este ativo. Confira se já existe um item com esse nome."
              : method === "PUT"
                ? "O ambiente recusou a atualização do perfil com HTTP " +
                  response.status +
                  "."
                : "O ambiente recusou o ativo com HTTP " +
                  response.status +
                  ".",
    };
  const assetId = count(response.body?.id);
  if (!assetId)
    return {
      status: "uncertain",
      assetId: null,
      message:
        "A resposta não trouxe um recibo válido. Confira o ambiente antes de repetir.",
    };
  return {
    status: "succeeded",
    assetId,
    message:
      method === "PUT" ? "Acesso do perfil atualizado." : "Ativo criado.",
  };
}

async function postSnapshot(configuration, snapshot) {
  const response = await piersecRequest("/api/campaigns/connection/snapshot", {
    token: configuration.connectorToken,
    body: { snapshot },
  });
  if (response.status < 200 || response.status >= 300)
    throw new Error("Falha ao atualizar os dados da conexão.");
}

async function claimCommand(configuration) {
  const response = await piersecRequest("/api/campaigns/connection/queue", {
    token: configuration.connectorToken,
    body: {},
  });
  if (response.status < 200 || response.status >= 300)
    throw new Error("Fila temporariamente indisponível.");
  return response.body;
}

async function claimAssetCommand(configuration) {
  const response = await piersecRequest(
    "/api/campaigns/connection/assets/queue",
    { token: configuration.connectorToken, body: {} },
  );
  if (response.status < 200 || response.status >= 300)
    throw new Error("Fila de ativos temporariamente indisponível.");
  return response.body;
}

async function sendAssetCommandResult(configuration, commandId, result) {
  const response = await piersecRequest(
    "/api/campaigns/connection/assets/result",
    {
      token: configuration.connectorToken,
      body: {
        commandId,
        status: result.status,
        assetId: result.assetId,
        message: text(result.message, 500),
        encryptedResult: result.encryptedResult ?? null,
      },
    },
  );
  if (response.status < 200 || response.status >= 300)
    throw new Error("Falha ao registrar o resultado da operação.");
}

async function sendCommandResult(configuration, commandId, result) {
  const response = await piersecRequest(
    "/api/campaigns/connection/queue/result",
    {
      token: configuration.connectorToken,
      body: {
        commandId,
        status: result.status,
        campaignId: result.campaignId,
        message: text(result.message, 500),
      },
    },
  );
  if (response.status < 200 || response.status >= 300)
    throw new Error("Falha ao registrar o resultado da ordem.");
}

async function run() {
  if (!piersecUrl || !campaignServiceUrl)
    throw new Error(
      "Configure os endereços HTTPS do Piersec e do serviço privado na Stack.",
    );
  const apiKey = text(await readFile(apiKeyFile, "utf8"), 512);
  if (!apiKey) throw new Error("O arquivo secreto da chave de API está vazio.");
  const ca = await readFile(caFile);
  const commandKeys = await loadOrCreateCommandKeys();
  commandPrivateKey = commandKeys.privateKey;
  const agent = serviceAgent(ca);
  try {
    const configuration = await pairIfNeeded(
      agent,
      apiKey,
      commandKeys.publicKey,
    );
    console.log("Conector ativo. Nenhuma porta de entrada foi publicada.");
    for (;;) {
      try {
        const snapshot = await readSnapshot(
          apiKey,
          agent,
          commandKeys.publicKey,
        );
        await postSnapshot(configuration, snapshot);
        console.log(
          "Dados sincronizados: " +
            snapshot.campaigns.length +
            " campanha(s), " +
            snapshot.groups.length +
            " grupo(s).",
        );
      } catch (error) {
        console.warn(
          "Sincronização indisponível; nova tentativa em 30 segundos.",
          error.message,
        );
      }
      try {
        const assetDispatch = await claimAssetCommand(configuration);
        if (assetDispatch?.commandId) {
          let result;
          try {
            result = await createCampaignAsset(
              apiKey,
              agent,
              text(assetDispatch.type, 40),
              assetDispatch.payload,
            );
          } catch (error) {
            result = {
              status: "failed",
              assetId: null,
              message: text(error.message, 500),
            };
          }
          try {
            await sendAssetCommandResult(
              configuration,
              assetDispatch.commandId,
              result,
            );
            console.log("Operação de ativo processada: " + result.status + ".");
            if (result.status === "succeeded") {
              try {
                const refreshed = await readSnapshot(
                  apiKey,
                  agent,
                  commandKeys.publicKey,
                );
                await postSnapshot(configuration, refreshed);
              } catch (error) {
                console.warn(
                  "Operação concluída; atualização da lista será repetida.",
                  error.message,
                );
              }
            }
          } catch (error) {
            console.error(
              "Não foi possível registrar o resultado da operação.",
              error.message,
            );
          }
        }
      } catch (error) {
        console.warn(
          "Fila de ativos temporariamente indisponível.",
          error.message,
        );
      }
      try {
        const dispatch = await claimCommand(configuration);
        if (dispatch?.commandId) {
          let result;
          try {
            result = await createConfirmedCampaign(
              apiKey,
              agent,
              dispatch.payload,
            );
          } catch (error) {
            result = {
              status: "failed",
              campaignId: null,
              message: text(error.message, 500),
            };
          }
          try {
            await sendCommandResult(configuration, dispatch.commandId, result);
            console.log("Ordem processada: " + result.status + ".");
          } catch (error) {
            console.error(
              "Não foi possível registrar o resultado. A ordem não será repetida automaticamente.",
              error.message,
            );
          }
        }
      } catch (error) {
        console.warn("Fila temporariamente indisponível.", error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } finally {
    agent.destroy();
  }
}

run().catch((error) => {
  console.error("Conector encerrado:", error.message);
  process.exitCode = 1;
});
