"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type MfaGuardState = "checking" | "allowed" | "required";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const [mfaState, setMfaState] = useState<MfaGuardState>(
    isSupabaseConfigured ? "checking" : "allowed",
  );
  const mustChangePassword =
    user?.app_metadata?.password_rotation_required === true;

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (pathname === "/mfa") {
      setMfaState("allowed");
      return;
    }
    if (mustChangePassword && pathname !== "/alterar-senha") {
      router.replace("/alterar-senha");
      return;
    }

    if (mustChangePassword) {
      setMfaState("allowed");
      return;
    }

    if (!supabase) return;
    let cancelled = false;
    void (async () => {
      const [{ data: factorsData, error: factorsError }, { data: aalData }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
      if (cancelled) return;
      const hasVerifiedFactor = Boolean(
        factorsData?.all?.some((factor) => factor.status === "verified"),
      );
      const mfaComplete =
        !factorsError && hasVerifiedFactor && aalData?.currentLevel === "aal2";
      setMfaState(mfaComplete ? "allowed" : "required");
      if (!mfaComplete) router.replace("/mfa");
    })();

    return () => {
      cancelled = true;
    };
  }, [mustChangePassword, pathname, ready, router, user?.id]);

  if (
    !ready ||
    (isSupabaseConfigured && !user) ||
    (isSupabaseConfigured &&
      mustChangePassword &&
      pathname !== "/alterar-senha") ||
    (isSupabaseConfigured &&
      pathname !== "/mfa" &&
      !mustChangePassword &&
      mfaState !== "allowed")
  ) {
    return (
      <main className="theme-canvas grid min-h-screen place-items-center p-7">
        <div className="surface-card rounded-[var(--radius-card)] px-8 py-7 text-[12px] text-[#7c8795] shadow-[0_18px_50px_rgba(25,34,45,0.08)]">
          Verificando acesso…
        </div>
      </main>
    );
  }

  return children;
}
