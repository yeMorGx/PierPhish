import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeEmailSampleExtension,
  parseEmailSample,
  validateEmailSampleInput,
  type EmailSampleAttachment,
  type ParsedEmailSample,
} from "@/lib/email-sample-parser";
import {
  canFitEmailSample,
  summarizeEmailSampleStorage,
} from "@/lib/email-sample-quota";
import { requireMfa } from "@/lib/server-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";
const bucketName = "campaign-email-samples";
const defaultMaxFileSizeMb = 10;
const defaultMaxStorageMb = 100;

type CampaignContext = {
  campaignId: number;
  companyId: string | null;
  workspaceId: string;
};

type SampleRow = {
  id: string;
  campaign_id: number;
  workspace_id: string;
  company_id: string;
  original_file_name: string;
  file_extension: "eml" | "msg";
  mime_type: string;
  size_bytes: number;
  sha256: string;
  storage_path: string;
  subject: string | null;
  from_address: string | null;
  to_addresses: string[];
  sent_at: string | null;
  parsed_html: string;
  parsed_text: string;
  attachments: EmailSampleAttachment[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

type CampaignAccessResult =
  | {
      client: SupabaseClient;
      context: CampaignContext;
      userId: string;
      error?: never;
    }
  | {
      client?: never;
      context?: never;
      userId?: never;
      error: NextResponse;
    };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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

function isGlobalAdminUser(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
}) {
  const role =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : "";
  return (
    user.email?.toLowerCase() === superAdminEmail ||
    user.app_metadata?.is_admin === true ||
    ["admin", "owner", "super_admin"].includes(role)
  );
}

function maxFileSizeBytes() {
  const megabytes = Number(
    process.env.MAX_EMAIL_SAMPLE_SIZE_MB ?? defaultMaxFileSizeMb,
  );
  return (
    Math.max(1, Number.isFinite(megabytes) ? megabytes : defaultMaxFileSizeMb) *
    1024 *
    1024
  );
}

function maxStorageBytes() {
  const megabytes = Number(
    process.env.MAX_EMAIL_SAMPLE_STORAGE_MB ?? defaultMaxStorageMb,
  );
  return (
    Math.max(1, Number.isFinite(megabytes) ? megabytes : defaultMaxStorageMb) *
    1024 *
    1024
  );
}

function fileName(value: string) {
  return value.split(/[\\/]/).pop()?.trim().slice(0, 240) || "exemplo-do-email";
}

function jsonError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Erro inesperado ao processar o arquivo.";
}

function uploadErrorMessage(error: unknown) {
  const message = jsonError(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("bucket not found") ||
    normalized.includes("campaign-email-samples")
  ) {
    return "O armazenamento de exemplos ainda não foi configurado. Aplique a migration 20260921120000_add_campaign_email_samples.sql no Supabase.";
  }
  if (
    normalized.includes("relation") &&
    normalized.includes("campaign_email_sample")
  ) {
    return "A estrutura de exemplos ainda não foi aplicada ao Supabase. Aplique a migration 20260921120000_add_campaign_email_samples.sql.";
  }
  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("new row violates")
  ) {
    return "O Supabase bloqueou o armazenamento deste exemplo. Verifique as políticas RLS e o acesso do usuário ao workspace.";
  }

  return `Não foi possível anexar o arquivo: ${message}`;
}

function samplePayload(sample: SampleRow | null) {
  if (!sample) return null;
  return {
    id: sample.id,
    campaignId: Number(sample.campaign_id),
    workspaceId: sample.workspace_id,
    companyId: sample.company_id,
    originalFileName: sample.original_file_name,
    fileExtension: sample.file_extension,
    mimeType: sample.mime_type,
    sizeBytes: Number(sample.size_bytes),
    sha256: sample.sha256,
    subject: sample.subject,
    fromAddress: sample.from_address,
    toAddresses: sample.to_addresses ?? [],
    sentAt: sample.sent_at,
    parsedHtml: sample.parsed_html,
    parsedText: sample.parsed_text,
    attachments: sample.attachments ?? [],
    createdAt: sample.created_at,
    updatedAt: sample.updated_at,
  };
}

async function logAction(
  client: SupabaseClient,
  values: {
    action:
      | "upload"
      | "replace"
      | "delete"
      | "parse_failed"
      | "upload_failed"
      | "orphan_cleanup";
    campaignId?: number | null;
    workspaceId?: string | null;
    sampleId?: string | null;
    userId?: string | null;
    details?: Record<string, unknown>;
  },
) {
  await client.from("campaign_email_sample_logs").insert({
    action: values.action,
    campaign_id: values.campaignId ?? null,
    workspace_id: values.workspaceId ?? null,
    sample_id: values.sampleId ?? null,
    user_id: values.userId ?? null,
    details: values.details ?? {},
  });
}

async function requireCampaignAccess(
  request: NextRequest,
  campaignId: number,
  mutation: boolean,
): Promise<CampaignAccessResult> {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: errorResponse("Sessão não encontrada.", 401) };
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return {
      error: errorResponse(
        "O armazenamento seguro precisa de NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY.",
        503,
      ),
    };
  }

  const authClient = getClient(publishableKey, token);
  const serviceClient = getClient(serviceRoleKey);
  if (!authClient || !serviceClient) {
    return { error: errorResponse("Supabase não configurado.", 503) };
  }

  const mfaError = await requireMfa(authClient, token);
  if (mfaError) return { error: mfaError };

  const { data: userData, error: userError } =
    await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: errorResponse("Sua sessão não é válida.", 401) };
  }

  const { data: campaign, error: campaignError } = await serviceClient
    .from("beephish_campaigns")
    .select("id,workspace_id,company_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError) {
    return {
      error: errorResponse("Não foi possível validar a campanha.", 503),
    };
  }
  if (!campaign?.workspace_id) {
    return { error: errorResponse("Campanha não encontrada.", 404) };
  }

  const globalAdmin = isGlobalAdminUser(userData.user);
  if (!globalAdmin) {
    const { data: membership, error: membershipError } = await authClient
      .from("pierphish_workspace_members")
      .select("role")
      .eq("workspace_id", campaign.workspace_id)
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError) {
      return {
        error: errorResponse("Não foi possível validar o workspace.", 503),
      };
    }
    const role = membership?.role ?? "";
    if (
      !membership ||
      (mutation && !["owner", "admin", "analyst"].includes(role))
    ) {
      return {
        error: errorResponse(
          mutation
            ? "Você não pode administrar exemplos neste workspace."
            : "Você não tem acesso a esta campanha.",
          403,
        ),
      };
    }
  }

  return {
    client: serviceClient,
    context: {
      campaignId,
      companyId: campaign.company_id ? String(campaign.company_id) : null,
      workspaceId: String(campaign.workspace_id),
    } satisfies CampaignContext,
    userId: userData.user.id,
  };
}

async function getSample(client: SupabaseClient, context: CampaignContext) {
  const { data, error } = await client
    .from("campaign_email_samples")
    .select(
      "id,campaign_id,workspace_id,company_id,original_file_name,file_extension,mime_type,size_bytes,sha256,storage_path,subject,from_address,to_addresses,sent_at,parsed_html,parsed_text,attachments,created_by,created_at,updated_at",
    )
    .eq("campaign_id", context.campaignId)
    .eq("workspace_id", context.workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as SampleRow | null) ?? null;
}

async function getStorageUsage(client: SupabaseClient, workspaceId: string) {
  const { data, error } = await client
    .from("campaign_email_samples")
    .select("size_bytes")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);
  if (error) throw error;
  const maxBytes = maxStorageBytes();
  return summarizeEmailSampleStorage(
    (data ?? []).map((row) => Number(row.size_bytes ?? 0)),
    maxBytes,
  );
}

async function uploadSampleInternal(request: NextRequest, campaignId: number) {
  const access = await requireCampaignAccess(request, campaignId, true);
  if (access.error) {
    return access.error;
  }
  const { client, context, userId } = access;
  if (!context.companyId) {
    return errorResponse(
      "Esta campanha ainda não está associada a uma empresa Beephish.",
      422,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Envie um arquivo EML ou MSG válido.", 400);
  }
  const fileValue = formData.get("file");
  if (
    !fileValue ||
    typeof fileValue !== "object" ||
    !("arrayBuffer" in fileValue)
  ) {
    return errorResponse("Escolha um arquivo .eml ou .msg.", 400);
  }
  const file = fileValue as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const limit = maxFileSizeBytes();
  if (buffer.byteLength > limit) {
    return errorResponse(
      `Este arquivo excede o limite de ${Math.round(limit / 1024 / 1024)} MB.`,
      413,
    );
  }

  const originalFileName = fileName(file.name || "exemplo-do-email");
  let extension: "eml" | "msg";
  let parsed: ParsedEmailSample;
  try {
    extension = validateEmailSampleInput(
      originalFileName,
      file.type || "",
      buffer,
    ) as "eml" | "msg";
    parsed = await parseEmailSample(extension, buffer);
  } catch (error) {
    await logAction(client, {
      action: "parse_failed",
      campaignId,
      workspaceId: context.workspaceId,
      userId,
      details: { fileName: originalFileName, error: jsonError(error) },
    });
    return errorResponse(jsonError(error), 422);
  }

  const existing = await getSample(client, context);
  const { data: duplicate, error: duplicateError } = await client
    .from("campaign_email_samples")
    .select("id")
    .eq("workspace_id", context.workspaceId)
    .eq("sha256", parsed.sha256)
    .maybeSingle();
  if (duplicateError)
    return errorResponse("Não foi possível validar duplicatas.", 503);
  if (duplicate && duplicate.id !== existing?.id) {
    return errorResponse(
      "Este arquivo já está cadastrado neste workspace.",
      409,
    );
  }

  const usage = await getStorageUsage(client, context.workspaceId);
  const previousSize = existing?.size_bytes ?? 0;
  if (!canFitEmailSample(usage, buffer.byteLength, previousSize)) {
    return errorResponse(
      `Este workspace utilizou todo o armazenamento disponível (${Math.round(usage.maxBytes / 1024 / 1024)} MB).`,
      413,
    );
  }

  const storagePath = `${context.workspaceId}/${campaignId}/${randomUUID()}.${extension}`;
  const mimeType =
    file.type ||
    (extension === "eml" ? "message/rfc822" : "application/vnd.ms-outlook");
  const { error: uploadError } = await client.storage
    .from(bucketName)
    .upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType: mimeType,
      upsert: false,
    });
  if (uploadError) {
    await logAction(client, {
      action: "upload_failed",
      campaignId,
      workspaceId: context.workspaceId,
      userId,
      details: { fileName: originalFileName, error: uploadError.message },
    });
    return errorResponse("Não foi possível armazenar o arquivo.", 502);
  }

  const row = {
    campaign_id: campaignId,
    workspace_id: context.workspaceId,
    company_id: context.companyId,
    original_file_name: originalFileName,
    file_extension: extension,
    mime_type: mimeType,
    size_bytes: buffer.byteLength,
    sha256: parsed.sha256,
    storage_path: storagePath,
    subject: parsed.subject,
    from_address: parsed.fromAddress,
    to_addresses: parsed.toAddresses,
    sent_at: parsed.sentAt,
    parsed_html: parsed.parsedHtml,
    parsed_text: parsed.parsedText,
    attachments: parsed.attachments,
    created_by: userId,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let saved: SampleRow | null = null;
  const action = existing ? "replace" : "upload";
  if (existing) {
    const { data, error } = await client
      .from("campaign_email_samples")
      .update(row)
      .eq("id", existing.id)
      .select(
        "id,campaign_id,workspace_id,company_id,original_file_name,file_extension,mime_type,size_bytes,sha256,storage_path,subject,from_address,to_addresses,sent_at,parsed_html,parsed_text,attachments,created_by,created_at,updated_at",
      )
      .single();
    if (error || !data) {
      await client.storage.from(bucketName).remove([storagePath]);
      return errorResponse(
        "Não foi possível substituir o exemplo do e-mail.",
        500,
      );
    }
    saved = data as SampleRow;
    const { error: removePreviousError } = await client.storage
      .from(bucketName)
      .remove([existing.storage_path]);
    if (removePreviousError) {
      await logAction(client, {
        action: "upload_failed",
        campaignId,
        workspaceId: context.workspaceId,
        sampleId: saved.id,
        userId,
        details: {
          orphanedPath: existing.storage_path,
          error: removePreviousError.message,
        },
      });
    }
  } else {
    const { data, error } = await client
      .from("campaign_email_samples")
      .insert(row)
      .select(
        "id,campaign_id,workspace_id,company_id,original_file_name,file_extension,mime_type,size_bytes,sha256,storage_path,subject,from_address,to_addresses,sent_at,parsed_html,parsed_text,attachments,created_by,created_at,updated_at",
      )
      .single();
    if (error || !data) {
      await client.storage.from(bucketName).remove([storagePath]);
      return errorResponse("Não foi possível salvar o exemplo do e-mail.", 500);
    }
    saved = data as SampleRow;
  }

  await logAction(client, {
    action,
    campaignId,
    workspaceId: context.workspaceId,
    sampleId: saved.id,
    userId,
    details: {
      fileName: originalFileName,
      sizeBytes: buffer.byteLength,
      sha256: parsed.sha256,
    },
  });
  return NextResponse.json({
    sample: samplePayload(saved),
    storage: await getStorageUsage(client, context.workspaceId),
  });
}

async function uploadSample(request: NextRequest, campaignId: number) {
  try {
    return await uploadSampleInternal(request, campaignId);
  } catch (error) {
    return errorResponse(uploadErrorMessage(error), 503);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const campaignId = Number((await params).id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return errorResponse("Campanha inválida.", 400);
  }
  const access = await requireCampaignAccess(request, campaignId, false);
  if (access.error) return access.error;
  try {
    const sample = await getSample(access.client, access.context);
    const storage = await getStorageUsage(
      access.client,
      access.context.workspaceId,
    );
    const mode = request.nextUrl.searchParams.get("mode");
    if (sample && (mode === "preview" || mode === "download")) {
      const { data, error } = await access.client.storage
        .from(bucketName)
        .createSignedUrl(sample.storage_path, 300, {
          download: mode === "download" ? sample.original_file_name : false,
        });
      if (error || !data?.signedUrl) {
        return errorResponse(
          "Não foi possível gerar o acesso temporário ao arquivo.",
          502,
        );
      }
      return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: 300 });
    }
    return NextResponse.json({
      sample: samplePayload(sample),
      storage,
      limits: {
        maxFileSizeBytes: maxFileSizeBytes(),
        maxStorageBytes: storage.maxBytes,
      },
    });
  } catch (error) {
    return errorResponse(
      `Não foi possível carregar o exemplo: ${jsonError(error)}`,
      503,
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const campaignId = Number((await params).id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return errorResponse("Campanha inválida.", 400);
  }
  return uploadSample(request, campaignId);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const campaignId = Number((await params).id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return errorResponse("Campanha inválida.", 400);
  }
  return uploadSample(request, campaignId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const campaignId = Number((await params).id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return errorResponse("Campanha inválida.", 400);
  }
  const access = await requireCampaignAccess(request, campaignId, true);
  if (access.error) {
    return access.error;
  }
  try {
    const sample = await getSample(access.client, access.context);
    if (!sample) return NextResponse.json({ sample: null });
    const { error: removeError } = await access.client.storage
      .from(bucketName)
      .remove([sample.storage_path]);
    if (removeError) {
      return errorResponse(
        "Não foi possível remover o arquivo armazenado.",
        502,
      );
    }
    const { error: deleteError } = await access.client
      .from("campaign_email_samples")
      .delete()
      .eq("id", sample.id);
    if (deleteError) {
      await logAction(access.client, {
        action: "delete",
        campaignId,
        workspaceId: access.context.workspaceId,
        sampleId: sample.id,
        userId: access.userId,
        details: { metadataDeleteFailed: deleteError.message },
      });
      return errorResponse(
        "O arquivo foi removido, mas os metadados precisam de revisão.",
        502,
      );
    }
    await logAction(access.client, {
      action: "delete",
      campaignId,
      workspaceId: access.context.workspaceId,
      sampleId: sample.id,
      userId: access.userId,
      details: {
        fileName: sample.original_file_name,
        sizeBytes: sample.size_bytes,
      },
    });
    return NextResponse.json({
      sample: null,
      storage: await getStorageUsage(access.client, access.context.workspaceId),
    });
  } catch (error) {
    return errorResponse(
      `Não foi possível remover o exemplo: ${jsonError(error)}`,
      503,
    );
  }
}
