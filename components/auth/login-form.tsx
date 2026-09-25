"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthPageShell, LoginBrand } from "@/components/auth/auth-page-shell";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;

    const destination =
      user.app_metadata?.password_rotation_required === true
        ? "/alterar-senha"
        : "/mfa";
    router.replace(destination);
  }, [ready, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || ssoLoading) return;
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftSignIn() {
    if (!supabase || loading || ssoLoading) return;

    setSsoLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/login`,
          scopes: "email",
        },
      });

      if (oauthError) {
        setError("Não foi possível entrar com a conta Microsoft.");
        setSsoLoading(false);
      }
    } catch {
      setError("Não foi possível entrar com a conta Microsoft.");
      setSsoLoading(false);
    }
  }

  if (!ready || user) {
    return (
      <AuthPageShell artwork={<LoginArtworkContent />}>
        <div className="login-loading">Abrindo o centro de risco…</div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      ariaBusy={loading || ssoLoading}
      artwork={<LoginArtworkContent />}
    >
      {isSupabaseConfigured ? (
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            E-mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Senha
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || ssoLoading}>
            {loading ? "Entrando…" : "Entrar"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      ) : (
        <div className="login-demo-card">
          <p>
            O Supabase ainda não está configurado neste ambiente. Abra a
            demonstração local para explorar o painel.
          </p>
          <Link href="/">
            Abrir demonstração <Icon name="arrow" size={15} />
          </Link>
        </div>
      )}

      {isSupabaseConfigured && (
        <div className="login-sso-row">
          <p className="login-sso-divider">
            <span>ou entre com</span>
          </p>
          <button
            aria-label="Entrar com Microsoft"
            className="login-sso-button"
            disabled={loading || ssoLoading}
            onClick={() => void handleMicrosoftSignIn()}
            title="Entrar com Microsoft"
            type="button"
          >
            <MicrosoftLogo />
            <span className="login-sso-label">Microsoft</span>
          </button>
        </div>
      )}
    </AuthPageShell>
  );
}

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" className="microsoft-logo" viewBox="0 0 24 24">
      <rect className="microsoft-logo-square is-red" height="11" width="11" />
      <rect
        className="microsoft-logo-square is-green"
        height="11"
        width="11"
        x="13"
      />
      <rect
        className="microsoft-logo-square is-blue"
        height="11"
        width="11"
        y="13"
      />
      <rect
        className="microsoft-logo-square is-yellow"
        height="11"
        width="11"
        x="13"
        y="13"
      />
    </svg>
  );
}

function LoginArtworkContent() {
  return (
    <video
      className="auth-stage-video"
      aria-label="Animação pixel art do PierPhish"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster="/pierphish-login.png"
    >
      <source src="/pierphish-login.mp4" type="video/mp4" />
      Seu navegador não suporta vídeo.
    </video>
  );
}
