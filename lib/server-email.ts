import { Resend } from "resend";

type EmailMessage = {
  to: string;
  subject: string;
  preview: string;
  heading: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
};

export type EmailSendResult =
  { sent: true } | { sent: false; reason: "not_configured" | "send_failed" };

export function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

export function getAppBaseUrl(requestOrigin?: string) {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  const candidate =
    configuredUrl ||
    (process.env.NODE_ENV === "production" ? "" : requestOrigin || "");
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (
      (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function createEmailHtml(message: EmailMessage) {
  const preview = escapeHtml(message.preview);
  const heading = escapeHtml(message.heading);
  const body = escapeHtml(message.body);
  const actionUrl = escapeHtml(message.actionUrl);
  const actionLabel = escapeHtml(message.actionLabel);

  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#f2f5f5;color:#17232b;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f5;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dce4e5;border-radius:18px;overflow:hidden">
          <tr><td style="padding:28px 32px 8px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#54646b">PIERSEC</td></tr>
          <tr><td style="padding:12px 32px 0"><h1 style="margin:0;font-size:24px;line-height:1.25;color:#17232b">${heading}</h1></td></tr>
          <tr><td style="padding:14px 32px 0;font-size:15px;line-height:1.6;color:#51616a">${body}</td></tr>
          <tr><td align="left" style="padding:26px 32px 28px">
            <a href="${actionUrl}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#17232b;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">${actionLabel}</a>
          </td></tr>
          <tr><td style="border-top:1px solid #e7eded;padding:18px 32px 24px;font-size:12px;line-height:1.55;color:#75838a">Se você não esperava esta mensagem, pode ignorá-la. O link é individual e expira conforme as regras de segurança da conta.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendPierSecEmail(
  message: EmailMessage,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [message.to],
      subject: message.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      html: createEmailHtml(message),
    });
    return error ? { sent: false, reason: "send_failed" } : { sent: true };
  } catch {
    return { sent: false, reason: "send_failed" };
  }
}

export function makeAccountInviteEmail(input: {
  to: string;
  name: string;
  actionUrl: string;
}) {
  const greeting = input.name ? `Olá, ${input.name}.` : "Olá.";
  return {
    to: input.to,
    subject: "Seu acesso ao PierSec está pronto",
    preview: "Confirme seu e-mail e defina uma senha para acessar o PierSec.",
    heading: "Ative seu acesso",
    body: `${greeting} Você recebeu um convite para acessar o PierSec. Confirme seu e-mail e defina uma senha para continuar.`,
    actionUrl: input.actionUrl,
    actionLabel: "Ativar acesso",
  } satisfies EmailMessage;
}

export function makeWorkspaceInviteEmail(input: {
  to: string;
  name: string;
  workspaceName: string;
  role: string;
  inviterName: string;
  actionUrl: string;
}) {
  const greeting = input.name ? `Olá, ${input.name}.` : "Olá.";
  return {
    to: input.to,
    subject: `Acesso liberado: ${input.workspaceName}`,
    preview: `Você foi adicionado ao workspace ${input.workspaceName}.`,
    heading: "Acesso liberado",
    body: `${greeting} ${input.inviterName} adicionou você ao workspace ${input.workspaceName} como ${input.role}. Entre no PierSec para continuar.`,
    actionUrl: input.actionUrl,
    actionLabel: "Abrir PierSec",
  } satisfies EmailMessage;
}

export function makePasswordResetEmail(input: {
  to: string;
  name: string;
  actionUrl: string;
}) {
  const greeting = input.name ? `Olá, ${input.name}.` : "Olá.";
  return {
    to: input.to,
    subject: "Redefina sua senha do PierSec",
    preview: "Use o link seguro para escolher uma nova senha.",
    heading: "Redefinir senha",
    body: `${greeting} Recebemos uma solicitação para redefinir sua senha. Se foi você, use o botão abaixo para escolher outra senha.`,
    actionUrl: input.actionUrl,
    actionLabel: "Escolher nova senha",
  } satisfies EmailMessage;
}
