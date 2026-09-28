import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAppBaseUrl,
  isResendConfigured,
  makePasswordResetEmail,
  sendPierSecEmail,
} from "@/lib/server-email";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const attempts = new Map<string, number[]>();
const windowMs = 15 * 60 * 1000;
const emailLimit = 3;
const ipLimit = 10;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function allowRequest(email: string, ip: string, now = Date.now()) {
  for (const [key, timestamps] of attempts) {
    const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);
    if (recent.length) attempts.set(key, recent);
    else attempts.delete(key);
  }

  const keys = [`email:${email}`, `ip:${ip}`];
  if (
    (attempts.get(keys[0])?.length ?? 0) >= emailLimit ||
    (attempts.get(keys[1])?.length ?? 0) >= ipLimit
  ) {
    return false;
  }

  for (const key of keys) {
    attempts.set(key, [...(attempts.get(key) ?? []), now]);
  }
  return true;
}

export async function POST(request: NextRequest) {
  let payload: { email?: unknown };
  try {
    payload = (await request.json()) as { email?: unknown };
  } catch {
    return responseError("Envie um e-mail válido.", 400);
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return responseError("Informe um e-mail válido.", 400);
  }

  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const ip =
    request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
  if (!allowRequest(email, ip)) {
    return NextResponse.json({ ok: true });
  }

  const appBaseUrl = getAppBaseUrl(request.nextUrl.origin);
  if (!supabaseUrl || !serviceRoleKey || !isResendConfigured() || !appBaseUrl) {
    return responseError(
      "O envio de e-mails ainda não está configurado neste ambiente.",
      503,
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  let linkResult;
  try {
    linkResult = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appBaseUrl}/redefinir-senha` },
    });
  } catch {
    console.error("[email] Password reset link generation failed.");
    return NextResponse.json({ ok: true });
  }
  const { data, error } = linkResult;

  // A mesma resposta é usada para contas inexistentes para evitar enumeração.
  if (error || !data.user?.email || !data.properties?.action_link) {
    return NextResponse.json({ ok: true });
  }

  const { sent } = await sendPierSecEmail(
    makePasswordResetEmail({
      to: data.user.email,
      name:
        typeof data.user.user_metadata?.display_name === "string"
          ? data.user.user_metadata.display_name
          : "",
      actionUrl: data.properties.action_link,
    }),
  );

  if (!sent) {
    console.error("[email] Password reset delivery failed.");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
