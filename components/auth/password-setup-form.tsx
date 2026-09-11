"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function PasswordSetupForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mustChangePassword =
    user?.app_metadata?.password_rotation_required === true;

  useEffect(() => {
    if (!ready) return;
    if (!isSupabaseConfigured || !user) {
      router.replace(isSupabaseConfigured ? "/login" : "/");
    } else if (!mustChangePassword) {
      router.replace("/");
    }
  }, [mustChangePassword, ready, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setError(null);

    if (password.length < 12) {
      setError("A nova senha precisa ter pelo menos 12 caracteres.");
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
      setError("Não foi possível atualizar a senha. Tente novamente.");
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setError("Sua sessão expirou. Entre novamente.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/account/complete-password-setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      setError("A senha mudou, mas não foi possível concluir seu acesso.");
      setLoading(false);
      return;
    }

    router.replace("/");
  }

  return (
    <main className="login-page theme-canvas">
      <section className="login-panel">
        <div className="login-panel-inner">
          <a className="login-brand" href="/" aria-label="PierPhish">
            <span className="login-brand-mark">P</span>
            <span>PierPhish</span>
          </a>
          <div className="login-copy">
            <p className="login-eyebrow">Primeiro acesso</p>
            <h1>Defina sua senha pessoal.</h1>
            <p>
              A senha inicial foi criada pelo administrador. Escolha uma nova
              senha para continuar no centro de risco.
            </p>
          </div>

          {ready && user ? (
            <form className="login-form" onSubmit={handleSubmit}>
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
              {error && <p className="login-error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? "Salvando…" : "Salvar nova senha"}
                <Icon name="arrow" size={17} />
              </button>
            </form>
          ) : (
            <div className="login-loading">Verificando seu acesso…</div>
          )}

          <p className="login-footer">
            Use pelo menos 12 caracteres com letras, números e símbolos.
          </p>
        </div>
      </section>
      <aside className="login-artwork" aria-label="Ilustração do PierPhish">
        <img
          src="/pierphish-login.png"
          alt="Ilustração pixel art do PierPhish"
        />
        <div className="login-artwork-caption">
          <span>PIERPHISH</span>
          <p>Uma visão mais clara sobre o comportamento humano.</p>
        </div>
      </aside>
    </main>
  );
}
