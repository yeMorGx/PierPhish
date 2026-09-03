"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (ready && isSupabaseConfigured && !user) router.replace("/login");
  }, [ready, router, user]);

  if (!ready || (isSupabaseConfigured && !user)) {
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
