"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type LoginPhase = "idle" | "authenticating" | "error" | "success";

gsap.registerPlugin(useGSAP);

export function LoginForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("idle");

  useEffect(() => {
    if (!ready || !user) return;

    const destination =
      user.app_metadata?.password_rotation_required === true
        ? "/alterar-senha"
        : "/mfa";
    if (loginPhase === "idle") {
      router.replace(destination);
      return;
    }

    if (loginPhase !== "success") return;

    const timeout = window.setTimeout(
      () => router.replace(destination),
      reducedMotion ? 0 : 1060,
    );
    return () => window.clearTimeout(timeout);
  }, [loginPhase, ready, reducedMotion, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || ssoLoading) return;
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

  async function handleMicrosoftSignIn() {
    if (!supabase || loading || ssoLoading) return;

    setSsoLoading(true);
    setError(null);
    setLoginPhase("authenticating");

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
        setLoginPhase("error");
        setSsoLoading(false);
      }
    } catch {
      setError("Não foi possível entrar com a conta Microsoft.");
      setLoginPhase("error");
      setSsoLoading(false);
    }
  }

  const isVideoFocused =
    loginPhase === "authenticating" || loginPhase === "success";
  const animationState =
    loginPhase === "error" ? "error" : isVideoFocused ? "focused" : "idle";
  const animatedStageMounted = ready && (!user || loginPhase !== "idle");

  useGSAP(
    () => {
      const stage = stageRef.current;
      const panel = stage?.querySelector<HTMLElement>(".login-panel");
      const artwork = stage?.querySelector<HTMLElement>(".login-artwork");
      const video = artwork?.querySelector<HTMLVideoElement>("video");
      if (!stage || !panel || !artwork || !video) return;

      const media = gsap.matchMedia();
      media.add(
        {
          desktop: "(min-width: 861px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const conditions = context.conditions as {
            desktop?: boolean;
            reduceMotion?: boolean;
          };
          const desktop = Boolean(conditions.desktop);
          const noMotion = Boolean(conditions.reduceMotion);
          const focused = animationState === "focused";
          const errorState = animationState === "error";
          const artworkFullScreenX = () => -panel.getBoundingClientRect().width;

          gsap.set(panel, { xPercent: 0, autoAlpha: 1 });
          gsap.set(artwork, {
            width: "100%",
            x: 0,
            xPercent: 0,
            autoAlpha: 1,
          });
          gsap.set(video, { scale: 1 });

          if (!desktop) {
            if (focused) {
              gsap.to(panel, {
                xPercent: -100,
                autoAlpha: 0,
                duration: noMotion ? 0 : 0.58,
                ease: "power3.inOut",
              });
            }
            if (errorState) {
              gsap.fromTo(
                panel,
                { x: -16 },
                { x: 0, duration: noMotion ? 0 : 0.36, ease: "power2.out" },
              );
            }
            return;
          }

          if (noMotion) {
            if (focused) {
              gsap.set(panel, { xPercent: -100, autoAlpha: 0 });
              gsap.set(artwork, {
                width: "100vw",
                x: artworkFullScreenX,
                xPercent: 0,
              });
            }
            return;
          }

          const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });

          if (focused) {
            timeline
              .to(
                panel,
                {
                  xPercent: -100,
                  autoAlpha: 0,
                  duration: 0.62,
                  ease: "power3.inOut",
                },
                0,
              )
              .to(
                artwork,
                {
                  width: "100vw",
                  x: artworkFullScreenX,
                  xPercent: 0,
                  duration: 0.94,
                  ease: "power4.inOut",
                },
                0,
              )
              .to(
                video,
                { scale: 1.045, duration: 0.94, ease: "power2.out" },
                0,
              );
          } else if (errorState) {
            gsap.set(panel, { xPercent: -100, autoAlpha: 0 });
            gsap.set(artwork, {
              width: "100vw",
              x: artworkFullScreenX,
              xPercent: 0,
            });
            timeline
              .to(
                artwork,
                {
                  width: "100%",
                  x: 0,
                  xPercent: 0,
                  duration: 0.76,
                  ease: "power4.inOut",
                },
                0,
              )
              .to(
                panel,
                {
                  xPercent: 0,
                  autoAlpha: 1,
                  duration: 0.62,
                  ease: "back.out(1.2)",
                },
                0.12,
              )
              .fromTo(
                panel,
                { x: -18 },
                { x: 0, duration: 0.28, ease: "power2.out" },
                0.7,
              );
          }

          return () => timeline.kill();
        },
      );

      return () => media.revert();
    },
    {
      dependencies: [animationState, animatedStageMounted],
      scope: stageRef,
      revertOnUpdate: true,
    },
  );

  if (!ready || (user && loginPhase === "idle")) {
    return (
      <main ref={stageRef} className="login-page theme-canvas">
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
      ref={stageRef}
      className="login-page theme-canvas"
      aria-busy={loading || ssoLoading}
      data-login-phase={loginPhase}
    >
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

          <p className="login-footer">
            Acesso interno protegido pelo Supabase Auth.
          </p>
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
    <Link className="login-brand" href="/" aria-label="PierPhish">
      <span>PierPhish</span>
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
