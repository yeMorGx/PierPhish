"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const mustChangePassword =
    user?.app_metadata?.password_rotation_required === true;

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (mustChangePassword && pathname !== "/alterar-senha") {
      router.replace("/alterar-senha");
    }
  }, [mustChangePassword, pathname, ready, router, user]);

  if (
    !ready ||
    (isSupabaseConfigured && !user) ||
    (isSupabaseConfigured &&
      mustChangePassword &&
      pathname !== "/alterar-senha")
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
