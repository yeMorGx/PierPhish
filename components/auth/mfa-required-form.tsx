"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type MfaPhase = "checking" | "enroll" | "challenge";

type AuthFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string | null;
};

function qrImageSource(value: string) {
  return value.startsWith("data:")
    ? value
    : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
}

export function MfaRequiredForm() {
  const router = useRouter();
  const { ready, user, signOut } = useAuth();
  const [phase, setPhase] = useState<MfaPhase>("checking");
  const [factorId, setFactorId] = useState("");
  const [factorName, setFactorName] = useState("PierPhish");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mustChangePassword =
    user?.app_metadata?.password_rotation_required === true;

  const loadMfaFlow = useCallback(async () => {
    if (!supabase || !user) return;

    setError(null);
    setPhase("checking");

    const [{ data: factorsData, error: factorsError }, { data: aalData }] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

    if (factorsError) {
      setError(
        "Não foi possível verificar o MFA agora. Atualize a página e tente novamente.",
      );
      return;
    }

    if (aalData?.currentLevel === "aal2") {
      router.replace("/");
      return;
    }

    const factors = (factorsData?.all ?? []) as AuthFactor[];
    const verifiedFactor = factors.find(
      (factor) => factor.status === "verified",
    );

    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
      setFactorName(verifiedFactor.friendly_name || "seu autenticador");
      setQrCode(null);
      setSecret(null);
      setPhase("challenge");
      return;
    }

    // An interrupted enrollment leaves an unverified factor behind. Remove it
    // before creating a fresh QR code so the user never gets stuck in setup.
    const pendingFactor = factors.find(
      (factor) =>
        factor.status === "unverified" && factor.factor_type === "totp",
    );
    if (pendingFactor) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
    }

    const { data: enrolledFactor, error: enrollError } =
      await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "PierPhish",
      });

    if (enrollError || !enrolledFactor) {
      setError(
        "Não foi possível iniciar o MFA. Verifique se o autenticador TOTP está habilitado no Supabase.",
      );
      return;
    }

    setFactorId(enrolledFactor.id);
    setFactorName(enrolledFactor.friendly_name || "PierPhish");
    setQrCode(enrolledFactor.totp?.qr_code ?? null);
    setSecret(enrolledFactor.totp?.secret ?? null);
    setPhase("enroll");
  }, [router, user]);

  useEffect(() => {
    if (!ready) return;
    if (!isSupabaseConfigured || !user) {
      router.replace(isSupabaseConfigured ? "/login" : "/");
      return;
    }
    if (mustChangePassword) {
      router.replace("/alterar-senha");
      return;
    }
    void loadMfaFlow();
  }, [loadMfaFlow, mustChangePassword, ready, router, user]);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !factorId) return;

    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length !== 6) {
      setError("Informe o código de 6 dígitos do seu autenticador.");
      return;
    }

    setLoading(true);
    setError(null);
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError("Não foi possível iniciar a verificação. Tente novamente.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: normalizedCode,
    });
    if (verifyError) {
      setError(
        "Código inválido ou expirado. Confira o autenticador e tente novamente.",
      );
      setLoading(false);
      return;
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      setError("MFA confirmado, mas não foi possível atualizar sua sessão.");
      setLoading(false);
      return;
    }

    router.replace("/");
  }

  if (!ready || !user || mustChangePassword || phase === "checking") {
    return (
      <main className="login-page theme-canvas">
        <section className="login-panel">
          <div className="login-panel-inner">
            <MfaBrand />
            <div className="login-loading">Preparando sua proteção…</div>
          </div>
        </section>
        <MfaArtwork />
      </main>
    );
  }

  const isEnrollment = phase === "enroll";

  return (
    <main className="login-page theme-canvas">
      <section className="login-panel">
        <div className="login-panel-inner">
          <MfaBrand />
          <div className="mfa-required-heading">
            <span className="login-eyebrow">
              <Icon name="shield" size={14} /> MFA obrigatório
            </span>
            <h1>
              {isEnrollment
                ? "Ative sua segunda etapa."
                : "Confirme seu acesso."}
            </h1>
            <p>
              {isEnrollment
                ? "Use um aplicativo autenticador para proteger sua conta antes de entrar no PierPhish."
                : `Abra ${factorName} e informe o código atual para continuar.`}
            </p>
          </div>

          {isEnrollment && qrCode && (
            <div className="mfa-setup-card">
              <img
                className="mfa-qr-code"
                src={qrImageSource(qrCode)}
                alt="QR Code para configurar o autenticador"
              />
              <div className="mfa-setup-copy">
                <strong>1. Escaneie o QR Code</strong>
                <span>
                  Abra Google Authenticator, Microsoft Authenticator ou outro
                  app TOTP compatível.
                </span>
                {secret && (
                  <details>
                    <summary>Não consegue escanear?</summary>
                    <code>{secret}</code>
                  </details>
                )}
              </div>
            </div>
          )}

          <form className="login-form mfa-required-form" onSubmit={verifyCode}>
            <label>
              {isEnrollment
                ? "2. Código de confirmação"
                : "Código do autenticador"}
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                required
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6}>
              {loading ? "Verificando…" : "Continuar"}
              <Icon name="arrow" size={17} />
            </button>
          </form>

          <button
            className="mfa-sign-out"
            type="button"
            onClick={() => void signOut()}
          >
            Sair desta conta
          </button>
          <p className="login-footer">
            Acesso liberado somente após a confirmação da segunda etapa.
          </p>
        </div>
      </section>
      <MfaArtwork />
    </main>
  );
}

function MfaBrand() {
  return (
    <div className="login-brand" aria-label="PierPhish">
      <span className="login-brand-mark">P</span>
      <span>PierPhish</span>
    </div>
  );
}

function MfaArtwork() {
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
