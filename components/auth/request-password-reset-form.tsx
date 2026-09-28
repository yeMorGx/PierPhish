"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  AuthPageShell,
  StaticAuthArtwork,
} from "@/components/auth/auth-page-shell";
import { Icon } from "@/components/ui/icon";

export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "Não foi possível solicitar a redefinição.");
        return;
      }
      setNotice(
        "Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.",
      );
    } catch {
      setError("Não foi possível solicitar a redefinição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      ariaBusy={loading}
      artwork={
        <StaticAuthArtwork
          alt="Ilustração de segurança digital do PierSec."
          caption="Acesso seguro ao seu ambiente."
          src="/password-reset-artwork.png"
        />
      }
    >
      <div className="login-copy">
        <p className="login-eyebrow">RECUPERAÇÃO DE ACESSO</p>
        <h1>Esqueceu sua senha?</h1>
        <p>Informe o e-mail da sua conta para receber um link seguro.</p>
      </div>
      <form
        className="login-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="login-success" role="status">
            {notice}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Enviar link"}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <p className="login-footer">
        <Link href="/login">Voltar para entrar</Link>
      </p>
    </AuthPageShell>
  );
}
