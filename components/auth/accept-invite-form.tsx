"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthPageShell,
  StaticAuthArtwork,
} from "@/components/auth/auth-page-shell";
import { supabase } from "@/lib/supabase";

export function AcceptInviteForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [type, setType] = useState<"invite" | "recovery">("invite");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepting = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const value = params.get("token_hash");
    const kind = params.get("type");
    if (value && (kind === "invite" || kind === "recovery")) {
      setToken(value);
      setType(kind);
    } else {
      setError(
        "O convite está incompleto. Peça um novo link ao administrador.",
      );
    }
    setReady(true);
  }, []);

  async function acceptInvite() {
    if (!supabase || !token || accepting.current) return;
    accepting.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (verifyError || !data.session || !data.user) {
        setError(
          "Este convite é inválido, expirou ou já foi usado. Peça ao administrador um novo link privado.",
        );
        return;
      }
      window.history.replaceState(null, "", window.location.pathname);
      setToken("");
      if (data.user.app_metadata?.password_rotation_required !== true) {
        setError(
          "Esta conta já concluiu o primeiro acesso. Entre pelo login com sua senha.",
        );
        return;
      }
      router.replace("/alterar-senha");
    } catch {
      setError(
        "Não foi possível validar o convite. Confira sua conexão e tente novamente.",
      );
    } finally {
      accepting.current = false;
      setLoading(false);
    }
  }

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
        <p className="login-eyebrow">Primeiro acesso</p>
        <h1>Aceite seu convite</h1>
        <p>
          Confirme para validar o convite e definir sua própria senha. Seu nome
          e a conta serão mostrados na próxima etapa.
        </p>
      </div>
      {!ready ? (
        <div className="login-loading">Preparando convite…</div>
      ) : (
        <div className="login-form">
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!token || loading || !supabase}
            onClick={() => void acceptInvite()}
          >
            {loading ? "Validando convite…" : "Aceitar convite e definir senha"}
          </button>
          <p className="login-footer">
            Uso único. Não compartilhe este link com outras pessoas.
          </p>
        </div>
      )}
    </AuthPageShell>
  );
}
