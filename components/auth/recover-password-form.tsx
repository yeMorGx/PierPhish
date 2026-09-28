"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import {
  AuthPageShell,
  StaticAuthArtwork,
} from "@/components/auth/auth-page-shell";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function RecoverPasswordForm() {
  const { ready, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!supabase || !user) {
      setError("Este link expirou ou já foi usado. Solicite outro.");
      return;
    }
    if (password.length < 12) {
      setError("Use pelo menos 12 caracteres.");
      return;
    }
    const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) =>
      pattern.test(password),
    ).length;
    if (groups < 3) {
      setError(
        "Use pelo menos 3 grupos: maiúsculas, minúsculas, números ou símbolos.",
      );
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setSuccess(true);
    setLoading(false);
  }

  const hasRecoverySession = isSupabaseConfigured && Boolean(user);

  return (
    <AuthPageShell
      ariaBusy={!ready || loading}
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
        <h1>Escolha uma nova senha</h1>
        <p>Defina uma senha segura para voltar ao PierSec.</p>
      </div>
      {success ? (
        <div className="login-success" role="status">
          <p>Senha atualizada. Entre novamente.</p>
          <Link href="/login">
            Ir para o login <Icon name="arrow" size={15} />
          </Link>
        </div>
      ) : !ready ? (
        <div className="login-loading">Validando seu link…</div>
      ) : hasRecoverySession ? (
        <form
          className="login-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label>
            Nova senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Salvar nova senha"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      ) : (
        <div className="login-demo-card">
          <p>{error ?? "Este link expirou ou já foi usado. Solicite outro."}</p>
          <Link href="/esqueci-senha">
            Solicitar outro link <Icon name="arrow" size={15} />
          </Link>
        </div>
      )}
    </AuthPageShell>
  );
}
