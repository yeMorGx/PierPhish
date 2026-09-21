"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type LoginPhase = "idle" | "authenticating" | "error" | "success";

const loginMotionTransition = {
  duration: 0.64,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function LoginForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("idle");

  useEffect(() => {
    if (!ready || !user) return;

    const destination =
      user.app_metadata?.password_rotation_required === true
        ? "/alterar-senha"
        : "/mfa";
    const shouldShowSuccess =
      loginPhase === "authenticating" || loginPhase === "success";

    if (!shouldShowSuccess) {
      router.replace(destination);
      return;
    }

    if (loginPhase === "authenticating") setLoginPhase("success");
    const timeout = window.setTimeout(
      () => router.replace(destination),
      reducedMotion ? 0 : 720,
    );
    return () => window.clearTimeout(timeout);
  }, [loginPhase, ready, reducedMotion, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setLoginPhase("authenticating");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoginPhase("error");
        return;
      }
      setLoginPhase("success");
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
      setLoginPhase("error");
    } finally {
      setLoading(false);
    }
  }

  const isVideoFocused =
    loginPhase === "authenticating" || loginPhase === "success";
  const mainGrid = isVideoFocused
    ? "0fr minmax(0, 1fr)"
    : "minmax(0, 1fr) minmax(0, 1fr)";

  if (!ready || (user && loginPhase === "idle")) {
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
    <motion.main
      className="login-page theme-canvas"
      animate={{ gridTemplateColumns: mainGrid }}
      transition={reducedMotion ? { duration: 0 } : loginMotionTransition}
    >
      <motion.section
        className="login-panel"
        animate={{
          opacity: isVideoFocused ? 0 : 1,
          x:
            loginPhase === "error"
              ? [0, -12, 12, -7, 0]
              : isVideoFocused
                ? "-12%"
                : 0,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : loginPhase === "error"
              ? { duration: 0.42, ease: "easeOut" }
              : loginMotionTransition
        }
      >
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
              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}
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
      </motion.section>
      <motion.aside
        className="login-artwork"
        aria-label="Ilustração do PierPhish"
        animate={{ scale: isVideoFocused ? 1.018 : 1 }}
        transition={reducedMotion ? { duration: 0 } : loginMotionTransition}
      >
        <LoginArtworkContent />
      </motion.aside>
    </motion.main>
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

function LoginArtworkContent() {
  return (
    <>
      <video
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
      <div className="login-artwork-caption">
        <span>PIERPHISH</span>
        <p>Uma visão mais clara sobre o comportamento humano.</p>
      </div>
    </>
  );
}

function LoginArtwork() {
  return (
    <aside className="login-artwork" aria-label="Ilustração do PierPhish">
      <LoginArtworkContent />
    </aside>
  );
}
