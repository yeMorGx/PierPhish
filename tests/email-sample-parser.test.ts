import { describe, expect, it } from "vitest";
import {
  normalizeEmailSampleExtension,
  parseEmailSample,
  validateEmailSampleInput,
} from "@/lib/email-sample-parser";

const minimalEml = Buffer.from(
  [
    "From: sender@example.com",
    "To: recipient@example.com",
    "Subject: Teste de segurança",
    "Date: Tue, 21 Sep 2026 12:00:00 -0300",
    "Content-Type: text/html; charset=utf-8",
    "",
    '<p>Mensagem segura</p><script>alert("xss")</script><img src="https://tracker.invalid/pixel.gif" onerror="alert(1)">',
  ].join("\r\n"),
);

describe("email sample parser", () => {
  it("normalizes only the supported file extensions", () => {
    expect(normalizeEmailSampleExtension("mensagem.EML")).toBe("eml");
    expect(normalizeEmailSampleExtension("mensagem.msg")).toBe("msg");
    expect(normalizeEmailSampleExtension("mensagem.pdf")).toBeNull();
  });

  it("validates an EML and rejects unsupported files", () => {
    expect(
      validateEmailSampleInput("mensagem.eml", "message/rfc822", minimalEml),
    ).toBe("eml");
    expect(() =>
      validateEmailSampleInput("mensagem.pdf", "application/pdf", minimalEml),
    ).toThrow("Use um arquivo .eml ou .msg");
    expect(() =>
      validateEmailSampleInput(
        "mensagem.msg",
        "application/octet-stream",
        minimalEml,
      ),
    ).toThrow("assinatura válida do Outlook");
  });

  it("parses metadata and strips active/external HTML content", async () => {
    const parsed = await parseEmailSample("eml", minimalEml);
    expect(parsed.subject).toBe("Teste de segurança");
    expect(parsed.fromAddress).toContain("sender@example.com");
    expect(parsed.toAddresses).toContain("recipient@example.com");
    expect(parsed.parsedText).toContain("Mensagem segura");
    expect(parsed.parsedHtml).not.toContain("<script");
    expect(parsed.parsedHtml).not.toContain("onerror");
    expect(parsed.parsedHtml).not.toContain("tracker.invalid");
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
