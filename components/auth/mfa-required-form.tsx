"use client";

import {
  FormEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const reducedMotion = useReducedMotion();

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

  function updateCodeDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((current) => {
      const next = current.padEnd(6, " ").split("");
      next[index] = digit;
      return next.join("");
    });
    if (digit && index < 5) codeInputRefs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Backspace" &&
      !/\d/.test(code[index] ?? "") &&
      index > 0
    ) {
      codeInputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeInputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setCode(pasted);
    codeInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

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
      <MfaStage>
        <MfaCard reducedMotion={reducedMotion}>
          <MfaBrand />
          <div className="login-loading">Preparando sua proteção…</div>
        </MfaCard>
      </MfaStage>
    );
  }

  const isEnrollment = phase === "enroll";

  return (
    <MfaStage>
      <MfaCard reducedMotion={reducedMotion}>
        <MfaBrand />
        <div className="mfa-required-heading">
          <span className="login-eyebrow">
            <Icon name="shield" size={14} /> MFA obrigatório
          </span>
          <h1>
            {isEnrollment ? "Ative sua segunda etapa." : "Confirme seu acesso."}
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
                Abra Google Authenticator, Microsoft Authenticator ou outro app
                TOTP compatível.
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
          <label className="mfa-code-label">
            <span>
              {isEnrollment
                ? "2. Código de confirmação"
                : "Código do autenticador"}
            </span>
            <div
              className="mfa-code-grid"
              role="group"
              aria-label="Código de 6 dígitos"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  aria-label={`Dígito ${index + 1} de 6`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  autoFocus={index === 0}
                  className="mfa-code-input"
                  inputMode="numeric"
                  key={index}
                  maxLength={1}
                  onChange={(event) =>
                    updateCodeDigit(index, event.target.value)
                  }
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  onPaste={handleCodePaste}
                  pattern="[0-9]"
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  required
                  value={/\d/.test(code[index] ?? "") ? code[index] : ""}
                />
              ))}
            </div>
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || code.replace(/\D/g, "").length !== 6}
          >
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
      </MfaCard>
    </MfaStage>
  );
}

function MfaBrand() {
  return (
    <div className="login-brand" aria-label="PierPhish">
      <span>PierPhish</span>
    </div>
  );
}

function MfaStage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mfa-stage theme-canvas">
      <Image
        className="mfa-stage-background"
        src="/mfa-door-background.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
      />
      {children}
    </main>
  );
}

function MfaCard({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.section
      className="mfa-card"
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.58, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.section>
  );
}
