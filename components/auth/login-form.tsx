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
    if (ready && user) router.replace("/");
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
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="surface-card rounded-[var(--radius-card)] px-8 py-7 text-[12px] text-[#7c8795] shadow-[0_18px_50px_rgba(25,34,45,0.08)]">
          Abrindo o centro de risco…
        </div>
      </main>
    );
  }

  return (
    <main className="theme-canvas grid min-h-screen place-items-center p-7">
      <div className="surface-card w-full max-w-[430px] rounded-[31px] p-[42px] shadow-[0_25px_80px_rgba(21,30,41,0.08)] max-[720px]:p-[30px_24px]">
        <p className="mb-[9px] text-[10px] leading-none font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
          BEEPHISH LENS / ACCESS
        </p>
        <h1 className="m-0 mb-[14px] text-[37px] leading-[0.95] font-[680] tracking-[-0.065em]">
          Entre no centro de risco.
        </h1>
        <p className="mb-[30px] max-w-[280px] text-[13px] leading-[1.5] text-[#8b939b]">
          Acompanhe sinais de exposição humana com clareza operacional.
        </p>

        {isSupabaseConfigured ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#6c747d]">
              E-mail
              <input
                className="h-[43px] rounded-[11px] border border-[#e3e6e7] bg-[#fbfcfc] px-3 text-[13px] text-[#18202b] outline-none focus:border-[#8a9ba6] focus:ring-[3px] focus:ring-[rgba(138,155,166,0.13)]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#6c747d]">
              Senha
              <input
                className="h-[43px] rounded-[11px] border border-[#e3e6e7] bg-[#fbfcfc] px-3 text-[13px] text-[#18202b] outline-none focus:border-[#8a9ba6] focus:ring-[3px] focus:ring-[rgba(138,155,166,0.13)]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="m-0 rounded-[9px] bg-[#fff0e9] px-3 py-2.5 text-[11px] text-[#8b4d39]">
                {error}
              </p>
            )}
            <button
              className="mt-[5px] inline-flex h-[45px] w-full items-center justify-center gap-[9px] rounded-[12px] border-0 bg-[#18202b] px-[15px] text-[12px] font-bold text-white shadow-[0_5px_15px_rgba(24,32,43,0.14)] transition-colors hover:bg-[#2d3a49]"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando…" : "Entrar"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        ) : (
          <div className="rounded-[18px] bg-[#f5f7f7] p-4">
            <p className="m-0 text-[12px] leading-relaxed text-[#697680]">
              O Supabase ainda não está configurado neste ambiente. Abra a
              demonstração local para explorar o painel.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-[12px] bg-[#18202b] px-4 py-3 text-[12px] font-bold text-white"
              href="/"
            >
              Abrir demonstração <Icon name="arrow" size={15} />
            </Link>
          </div>
        )}
        <p className="mt-[26px] mb-0 text-[10px] text-[#a3a8ad]">
          Acesso interno protegido pelo Supabase Auth.
        </p>
      </div>
    </main>
  );
}
