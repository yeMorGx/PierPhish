import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { persistedPrimaryWorkspaceId } from "@/lib/company-data";
import { generatePptx } from "@/lib/export/pptx";
import { parseRasterDataUrl } from "@/lib/export/images";
import { identifyAikidoUser, requireMfa } from "@/lib/server-auth";
import { SLIDE_TEMPLATES } from "@/templates/pptx/manifest";
import { MAX_EXPORT_CAMPAIGNS, type SlideTemplate } from "@/lib/export/types";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = "admin@teste.com";
const MAX_REQUEST_BYTES = 1_600_000;

const safeText = z
  .string()
  .max(500)
  .refine(
    (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
  );

const slideSchema = z
  .object({
    template: z.enum(["capa", "metricas", "campanhas"]),
    fields: z.record(z.string().max(80), safeText).default({}),
    images: z.record(z.string().max(80), z.string().max(1_400_000)).optional(),
    tables: z
      .record(
        z.string().max(80),
        z
          .array(z.array(z.string().max(500)).max(4))
          .min(2)
          .max(6),
      )
      .optional(),
  })
  .strict();

const requestSchema = z
  .object({
    workspaceId: z.string().max(64),
    request: z
      .object({
        title: z.string().trim().min(1).max(100),
        slides: z.array(slideSchema).min(1).max(52),
      })
      .strict(),
  })
  .strict();

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClient(token: string) {
  const key = publishableKey ?? serviceRoleKey;
  if (!supabaseUrl || !key) return null;

  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function isGlobalAdmin(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
}) {
  const metadata = user.app_metadata;
  const role = typeof metadata?.role === "string" ? metadata.role : "";
  return (
    user.email?.toLowerCase() === superAdminEmail ||
    metadata?.is_admin === true ||
    ["admin", "owner", "super_admin"].includes(role)
  );
}

function databaseWorkspaceId(workspaceId: string) {
  return workspaceId === "primary" ? persistedPrimaryWorkspaceId : workspaceId;
}

function validateManifest(request: z.infer<typeof requestSchema>["request"]) {
  const usedTemplates = new Set<SlideTemplate>();
  let campaignRows = 0;
  for (const [slideIndex, slide] of request.slides.entries()) {
    const manifest = SLIDE_TEMPLATES[slide.template];
    const allowedFields = new Set(manifest.fields);
    const allowedImages = new Set(manifest.images);
    const allowedTables = new Set(manifest.tables);

    if (usedTemplates.has(slide.template) && slide.template !== "campanhas") {
      return `O modelo "${slide.template}" aparece mais de uma vez.`;
    }
    usedTemplates.add(slide.template);

    if (
      Object.keys(slide.fields).some((name) => !allowedFields.has(name)) ||
      manifest.fields.some((name) => !(name in slide.fields))
    ) {
      return `Campos inválidos no slide ${slideIndex + 1}. Confira o manifesto do modelo.`;
    }
    if (
      Object.keys(slide.images ?? {}).some((name) => !allowedImages.has(name))
    ) {
      return `Imagem inválida no slide ${slideIndex + 1}.`;
    }
    if (
      Object.keys(slide.tables ?? {}).some((name) => !allowedTables.has(name))
    ) {
      return `Tabela inválida no slide ${slideIndex + 1}.`;
    }

    for (const image of Object.values(slide.images ?? {})) {
      if (!parseRasterDataUrl(image)) {
        return "Use uma imagem PNG ou JPEG válida de até 1 MB.";
      }
    }
    for (const tableName of manifest.tables) {
      const rows = slide.tables?.[tableName];
      if (!rows?.length || rows.some((row) => row.length !== 4)) {
        return `A tabela "${tableName}" precisa conter quatro colunas.`;
      }
      campaignRows += rows.length - 1;
    }
  }
  if (campaignRows > MAX_EXPORT_CAMPAIGNS) {
    return `O arquivo pode conter até ${MAX_EXPORT_CAMPAIGNS} campanhas.`;
  }
  return null;
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "relatorio-de-campanhas";
}

async function readLimitedBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError("Sessão não encontrada.", 401);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return responseError("O relatório excede o limite permitido.", 413);
  }

  const client = getClient(token);
  if (!client)
    return responseError("O Supabase não foi configurado no servidor.", 503);

  const mfaError = await requireMfa(client, token);
  if (mfaError) return mfaError;

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user)
    return responseError("Sua sessão não é válida.", 401);
  identifyAikidoUser(userData.user);

  const rawBody = await readLimitedBody(request);
  if (rawBody === null) {
    return responseError("O relatório excede o limite permitido.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return responseError("O pedido de exportação não contém JSON válido.", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return responseError("Dados de exportação inválidos.", 400);
  const validationError = validateManifest(parsed.data.request);
  if (validationError) return responseError(validationError, 400);

  const { workspaceId, request: exportRequest } = parsed.data;
  if (
    workspaceId !== "primary" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      workspaceId,
    )
  ) {
    return responseError("Workspace inválido.", 400);
  }

  if (!isGlobalAdmin(userData.user)) {
    const { data: membership, error: membershipError } = await client
      .from("pierphish_workspace_members")
      .select("user_id")
      .eq("workspace_id", databaseWorkspaceId(workspaceId))
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      return responseError(
        "Não foi possível verificar o acesso ao workspace.",
        503,
      );
    }
    if (!membership)
      return responseError("Você não tem acesso a este workspace.", 403);
  }

  try {
    const buffer = await generatePptx(exportRequest);
    const filename = `${slugify(exportRequest.title)}.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return responseError("Não foi possível gerar o arquivo PowerPoint.", 500);
  }
}
