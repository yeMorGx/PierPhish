"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const loginArtworkPhrases = [
  "Uma visão mais clara sobre o comportamento humano.",
  "Transforme sinais em decisões mais seguras.",
  "Antecipe riscos antes que virem incidentes.",
  "Conscientização que protege cada pessoa.",
];

gsap.registerPlugin(useGSAP);

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
    <main
      className="login-page theme-canvas"
      aria-busy={loading || ssoLoading}
    >
      <section className="login-panel">
        <div className="login-panel-inner">
          <LoginBrand />

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
        </div>
      </section>
      <aside className="login-artwork" aria-label="Ilustração do PierPhish">
        <LoginArtworkContent />
      </aside>
    </main>
  );
}

function LoginBrand() {
  return (
    <Link
      className="login-brand"
      href="/"
      aria-label="PierPhish. Powered by PierSec"
    >
      <span className="login-brand-name">PierPhish</span>
      <span className="login-brand-powered" aria-label="Powered by PierSec">
        <span>Powered by</span>
        <Image src="/piersec-logo.png" alt="PierSec" width={44} height={44} />
      </span>
    </Link>
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
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrase = loginArtworkPhrases[phraseIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % loginArtworkPhrases.length);
    }, 6200);

    return () => window.clearInterval(interval);
  }, []);

  useGSAP(
    () => {
      const caption = captionRef.current;
      if (!caption) return;

      const letters = caption.querySelectorAll<HTMLElement>(
        ".login-caption-letter",
      );
      if (!letters.length) return;

      const media = gsap.matchMedia();
      media.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const conditions = context.conditions as {
            reduceMotion?: boolean;
          };

          if (conditions.reduceMotion) {
            gsap.set(letters, { autoAlpha: 1, filter: "blur(0px)", y: 0 });
            return;
          }

          gsap.fromTo(
            letters,
            { autoAlpha: 0, filter: "blur(4px)", y: 10 },
            {
              autoAlpha: 1,
              filter: "blur(0px)",
              duration: 0.42,
              ease: "power3.out",
              stagger: 0.028,
              y: 0,
            },
          );
        },
      );

      return () => media.revert();
    },
    {
      dependencies: [phraseIndex],
      revertOnUpdate: true,
      scope: captionRef,
    },
  );

  return (
    <>
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
      <div className="login-artwork-caption">
        <p
          ref={captionRef}
          aria-label={phrase}
          aria-live="polite"
          className="login-artwork-caption-text"
        >
          {Array.from(phrase).map((character, index) => (
            <span
              aria-hidden="true"
              className="login-caption-letter"
              key={`${phraseIndex}-${index}`}
            >
              {character === " " ? "\u00a0" : character}
            </span>
          ))}
        </p>
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
