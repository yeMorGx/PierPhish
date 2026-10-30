"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { recordClientAuditAction } from "@/lib/client-audit";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    let sessionChanged = false;
    const listener = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      sessionChanged = true;
      setSession(nextSession);
      setReady(true);
      if (event === "SIGNED_IN" && nextSession?.access_token) {
        recordClientAuditAction(
          nextSession.access_token,
          "auth.login_succeeded",
        );
      }
    });
    const subscription = listener.data.subscription;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted || sessionChanged) return;
        setSession(data.session ?? null);
        setReady(true);
      } catch {
        if (!mounted || sessionChanged) return;
        setSession(null);
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (session?.access_token) {
      recordClientAuditAction(session.access_token, "auth.logout");
    }
    await supabase?.auth.signOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, ready, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
