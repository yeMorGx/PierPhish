import { createClient, processLock } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // A página usa um único cliente Supabase. Serializar as operações de
        // sessão evita a corrida do Navigator LockManager durante a carga e o
        // refresh automático do token.
        lock: processLock,
      },
    })
  : null;
