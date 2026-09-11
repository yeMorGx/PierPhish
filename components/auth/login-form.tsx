"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) {
      router.replace(
        user.app_metadata?.password_rotation_required === true
          ? "/alterar-senha"
          : "/",
      );
    }
  }, [ready, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  if (!ready || user) {
    return (
      <main className="login-page theme-canvas">
        <section className="login-panel">
          <div className="login-panel-inner">
            <LoginBrand />
            <div className="login-loading">Abrindo o centro de risco…</div>
          </div>
        </section>
        <LoginArtwork />
      </main>
    );
  }

  return (
    <main className="login-page theme-canvas">
      <section className="login-panel">
        <div className="login-panel-inner">
          <LoginBrand />

          <div className="login-copy">
            <p className="login-eyebrow">Acesso protegido</p>
            <h1>Entre no centro de risco.</h1>
            <p>Acompanhe sinais de exposição humana com clareza operacional.</p>
          </div>

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
              {error && <p className="login-error">{error}</p>}
              <button type="submit" disabled={loading}>
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

          <p className="login-footer">
            Acesso interno protegido pelo Supabase Auth.
          </p>
        </div>
      </section>
      <LoginArtwork />
    </main>
  );
}

function LoginBrand() {
  return (
    <Link className="login-brand" href="/" aria-label="PierPhish">
      <span className="login-brand-mark">P</span>
      <span>PierPhish</span>
    </Link>
  );
}

function LoginArtwork() {
  return (
    <aside className="login-artwork" aria-label="Ilustração do PierPhish">
      <img src="/pierphish-login.png" alt="Ilustração pixel art do PierPhish" />
      <div className="login-artwork-caption">
        <span>PIERPHISH</span>
        <p>Uma visão mais clara sobre o comportamento humano.</p>
      </div>
    </aside>
  );
}
