import MsgReader, {
  type AttachmentData,
  type FieldsData,
} from "@kenjiuno/msgreader";
import { createHash } from "node:crypto";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import sanitizeHtml from "sanitize-html";

export type EmailSampleAttachment = {
  contentType: string;
  inline: boolean;
  name: string;
  size: number;
};

export type ParsedEmailSample = {
  attachments: EmailSampleAttachment[];
  fromAddress: string | null;
  parsedHtml: string;
  parsedText: string;
  sentAt: string | null;
  sha256: string;
  subject: string | null;
  toAddresses: string[];
};

const MAX_PARSED_TEXT_LENGTH = 500_000;
const MAX_PARSED_HTML_LENGTH = 2_000_000;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addressText(value: AddressObject | undefined) {
  return text(value?.text) || null;
}

function addressList(
  value: AddressObject | AddressObject[] | undefined,
): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) =>
    item.value.flatMap((address) => {
      const candidate = address.address ?? address.name;
      return candidate ? [candidate.trim()] : [];
    }),
  );
}

function safeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const candidate = text(value);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textFromHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function sanitizeEmailHtml(value: string) {
  const sanitized = sanitizeHtml(value, {
    allowedTags: [
      "a",
      "article",
      "b",
      "blockquote",
      "br",
      "caption",
      "code",
      "col",
      "colgroup",
      "dd",
      "div",
      "dl",
      "dt",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "section",
      "small",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["alt", "height", "src", "width"],
      col: ["span", "width"],
      colgroup: ["span", "width"],
      table: ["cellpadding", "cellspacing", "border", "width"],
      td: ["align", "colspan", "rowspan", "valign", "width"],
      th: ["align", "colspan", "rowspan", "valign", "width"],
      "*": ["class", "dir", "lang"],
    },
    allowedSchemes: ["data", "http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
      img: ["data"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          href: attributes.href ?? "#",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
          title: attributes.title ?? "",
        },
      }),
    },
  });

  return sanitized.slice(0, MAX_PARSED_HTML_LENGTH);
}

function inlineContentIds(
  html: string,
  attachments: Array<{
    cid?: string;
    content: Buffer;
    contentType: string;
  }>,
) {
  return attachments.reduce((result, attachment) => {
    if (!attachment.cid || !attachment.content.length) return result;
    const dataUri = `data:${attachment.contentType};base64,${attachment.content.toString("base64")}`;
    const escapedCid = attachment.cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result.replace(
      new RegExp(`cid:[<]?${escapedCid}[>]?`, "gi"),
      dataUri,
    );
  }, html);
}

function msgArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function msgAttachmentMeta(attachment: FieldsData): EmailSampleAttachment {
  return {
    contentType: text(attachment.attachMimeTag) || "application/octet-stream",
    inline: Boolean(attachment.pidContentId),
    name:
      text(attachment.fileName) ||
      text(attachment.fileNameShort) ||
      "Anexo sem nome",
    size: Number(attachment.contentLength ?? 0),
  };
}

function parseMsg(buffer: Buffer): ParsedEmailSample {
  const reader = new MsgReader(msgArrayBuffer(buffer));
  const data = reader.getFileData();
  if (data.error)
    throw new Error(`Não foi possível ler o arquivo MSG: ${data.error}`);

  const attachments = (data.attachments ?? []).map(msgAttachmentMeta);
  const attachmentBuffers = (data.attachments ?? []).flatMap((attachment) => {
    try {
      const value: AttachmentData = reader.getAttachment(attachment);
      return [
        {
          cid: attachment.pidContentId,
          content: Buffer.from(value.content),
          contentType:
            text(attachment.attachMimeTag) || "application/octet-stream",
        },
      ];
    } catch {
      return [];
    }
  });
  const sourceHtml =
    text(data.bodyHtml) || `<pre>${escapeHtml(text(data.body))}</pre>`;
  const parsedHtml = sanitizeEmailHtml(
    inlineContentIds(sourceHtml, attachmentBuffers),
  );
  const parsedText = text(data.body) || textFromHtml(parsedHtml);
  const recipients = (data.recipients ?? [])
    .filter((recipient) => recipient.recipType !== "bcc")
    .flatMap((recipient) => {
      const value =
        text(recipient.smtpAddress) ||
        text(recipient.email) ||
        text(recipient.name);
      return value ? [value] : [];
    });

  return {
    attachments,
    fromAddress:
      text(data.senderSmtpAddress) ||
      text(data.senderEmail) ||
      text(data.senderName) ||
      null,
    parsedHtml,
    parsedText: parsedText.slice(0, MAX_PARSED_TEXT_LENGTH),
    sentAt: safeDate(data.messageDeliveryTime ?? data.clientSubmitTime),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    subject: text(data.subject) || null,
    toAddresses: recipients,
  };
}

function parseEml(buffer: Buffer): Promise<ParsedEmailSample> {
  return simpleParser(buffer).then((mail: ParsedMail) => {
    const attachments = mail.attachments.map((attachment) => ({
      contentType: attachment.contentType || "application/octet-stream",
      inline: Boolean(attachment.related || attachment.cid),
      name: attachment.filename || "Anexo sem nome",
      size: attachment.size,
    }));
    const htmlSource =
      typeof mail.html === "string"
        ? mail.html
        : `<pre>${escapeHtml(mail.text ?? "")}</pre>`;
    const parsedHtml = sanitizeEmailHtml(
      inlineContentIds(
        htmlSource,
        mail.attachments.map((attachment) => ({
          cid: attachment.cid,
          content: attachment.content,
          contentType: attachment.contentType,
        })),
      ),
    );
    const parsedText = text(mail.text) || textFromHtml(parsedHtml);
    if (
      !mail.headerLines.length &&
      !mail.subject &&
      !mail.from &&
      !parsedText
    ) {
      throw new Error("O arquivo EML não contém uma mensagem interpretável.");
    }

    return {
      attachments,
      fromAddress: addressText(mail.from),
      parsedHtml,
      parsedText: parsedText.slice(0, MAX_PARSED_TEXT_LENGTH),
      sentAt: safeDate(mail.date),
      sha256: createHash("sha256").update(buffer).digest("hex"),
      subject: text(mail.subject) || null,
      toAddresses: addressList(mail.to),
    };
  });
}

export function normalizeEmailSampleExtension(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return extension === "eml" || extension === "msg" ? extension : null;
}

export function validateEmailSampleInput(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
) {
  const extension = normalizeEmailSampleExtension(fileName);
  if (!extension)
    throw new Error("Formato inválido. Use um arquivo .eml ou .msg.");
  if (!buffer.length) throw new Error("O arquivo está vazio.");

  const normalizedMime = mimeType.toLowerCase().trim();
  const allowedMimeTypes =
    extension === "eml"
      ? [
          "",
          "application/eml",
          "application/octet-stream",
          "message/rfc822",
          "text/plain",
        ]
      : [
          "",
          "application/msoutlook",
          "application/octet-stream",
          "application/vnd.ms-outlook",
        ];
  if (!allowedMimeTypes.includes(normalizedMime)) {
    throw new Error(
      `O tipo MIME ${mimeType || "desconhecido"} não corresponde a um arquivo .${extension}.`,
    );
  }

  if (extension === "msg") {
    const signature = buffer.subarray(0, 8).toString("hex");
    if (signature !== "d0cf11e0a1b11ae1") {
      throw new Error(
        "O arquivo MSG não possui uma assinatura válida do Outlook.",
      );
    }
  }

  if (extension === "eml") {
    const header = buffer.subarray(0, 16_384).toString("utf8");
    if (
      !/^(from|date|to|cc|subject|mime-version|content-type):/im.test(header)
    ) {
      throw new Error(
        "O arquivo EML não possui cabeçalhos de e-mail reconhecíveis.",
      );
    }
  }

  return extension;
}

export async function parseEmailSample(
  extension: "eml" | "msg",
  buffer: Buffer,
) {
  return extension === "eml" ? parseEml(buffer) : parseMsg(buffer);
}
