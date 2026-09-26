"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const preferencesTable = "pierphish_user_preferences";
const avatarBucket = "profile-avatars";

export type ProfilePreferences = {
  displayName: string;
  avatar: string | null;
  avatarPath: string | null;
  completedTourPaths: string[];
};

type ProfileContextValue = {
  preferences: ProfilePreferences;
  ready: boolean;
  setDisplayName: (displayName: string) => void;
  setAvatar: (avatar: string | null) => void;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
  isTourCompleted: (path: string) => boolean;
  markTourCompleted: (path: string) => void;
  resetTour: (path: string) => void;
  reset: () => void;
};

const defaultPreferences: ProfilePreferences = {
  displayName: "",
  avatar: null,
  avatarPath: null,
  completedTourPaths: [],
};
const storagePrefix = "pierphish-profile-preferences";
const ProfileContext = createContext<ProfileContextValue | null>(null);

function storageKeyFor(userId: string | null, email: string | null) {
  const accountKey = userId ?? email ?? "demo";
  return `${storagePrefix}:${accountKey}`;
}

function isValidAvatar(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ((value.length <= 4_500_000 &&
      /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) ||
      /^\/avatars\/monkey-\d{2}-[a-z-]+\.png$/i.test(value) ||
      /^https:\/\//i.test(value))
  );
}

function normalizePreferences(value: unknown): ProfilePreferences {
  if (!value || typeof value !== "object") return defaultPreferences;
  const parsed = value as Partial<ProfilePreferences>;
  return {
    displayName:
      typeof parsed.displayName === "string"
        ? parsed.displayName.slice(0, 48)
        : defaultPreferences.displayName,
    avatar: isValidAvatar(parsed.avatar) ? parsed.avatar : null,
    avatarPath:
      typeof parsed.avatarPath === "string" ? parsed.avatarPath : null,
    completedTourPaths: Array.isArray(parsed.completedTourPaths)
      ? parsed.completedTourPaths.filter(
          (path): path is string => typeof path === "string",
        )
      : [],
  };
}

function readLocalPreferences(storageKey: string) {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return defaultPreferences;

  try {
    return normalizePreferences(JSON.parse(stored));
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaultPreferences;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível ler a imagem."));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function publicAvatarUrl(path: string) {
  return (
    supabase?.storage.from(avatarBucket).getPublicUrl(path).data.publicUrl ??
    null
  );
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, user } = useAuth();
  const storageKey = storageKeyFor(user?.id ?? null, user?.email ?? null);
  const remoteProfileEnabled = Boolean(
    isSupabaseConfigured && supabase && user?.id,
  );
  const [preferences, setPreferences] =
    useState<ProfilePreferences>(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [remoteProfileAvailable, setRemoteProfileAvailable] = useState(false);
  const persistTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setRemoteProfileAvailable(false);
    setPreferences(defaultPreferences);

    if (!authReady) return () => undefined;

    const localPreferences = readLocalPreferences(storageKey);

    if (!remoteProfileEnabled || !supabase || !user?.id) {
      setPreferences(localPreferences);
      setReady(true);
      return () => undefined;
    }

    void (async () => {
      const { data, error } = await supabase
        .from(preferencesTable)
        .select("display_name, avatar_path, tour_completed_paths")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn(
          "Preferências remotas indisponíveis; usando fallback local.",
          error,
        );
        setPreferences(localPreferences);
        setReady(true);
        return;
      }

      const avatarPath =
        typeof data?.avatar_path === "string" ? data.avatar_path : null;
      const remotePreferences = normalizePreferences({
        avatar: avatarPath ? publicAvatarUrl(avatarPath) : null,
        avatarPath,
        completedTourPaths: data?.tour_completed_paths ?? [],
        displayName: data?.display_name ?? "",
      });

      setRemoteProfileAvailable(true);
      setPreferences(data ? remotePreferences : localPreferences);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, remoteProfileEnabled, storageKey, user?.id]);

  useEffect(() => {
    if (!ready) return;

    if (
      remoteProfileEnabled &&
      remoteProfileAvailable &&
      supabase &&
      user?.id
    ) {
      const client = supabase;
      const userId = user.id;
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
      }
      persistTimer.current = window.setTimeout(() => {
        void client
          .from(preferencesTable)
          .upsert(
            {
              avatar_path: preferences.avatarPath,
              display_name: preferences.displayName,
              tour_completed_paths: preferences.completedTourPaths,
              updated_at: new Date().toISOString(),
              user_id: userId,
            },
            { onConflict: "user_id" },
          )
          .then(({ error }) => {
            if (error) {
              console.warn(
                "Não foi possível salvar as preferências da conta.",
                error,
              );
            }
          });
      }, 450);
    } else {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(preferences));
      } catch {
        // O estado continua disponível nesta sessão se o storage estiver cheio.
      }
    }

    return () => {
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
    };
  }, [
    preferences,
    ready,
    remoteProfileAvailable,
    remoteProfileEnabled,
    storageKey,
    user?.id,
  ]);

  const setDisplayName = useCallback((displayName: string) => {
    setPreferences((current) => ({
      ...current,
      displayName: displayName.slice(0, 48),
    }));
  }, []);

  const setAvatar = useCallback((avatar: string | null) => {
    setPreferences((current) => ({
      ...current,
      avatar:
        avatar === null || isValidAvatar(avatar) ? avatar : current.avatar,
      avatarPath: null,
    }));
  }, []);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!remoteProfileEnabled || !supabase || !user?.id) {
        const avatar = await fileToDataUrl(file);
        setPreferences((current) => ({
          ...current,
          avatar,
          avatarPath: null,
        }));
        return;
      }

      const path = `${user.id}/avatar`;
      const { error } = await supabase.storage
        .from(avatarBucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });
      if (error) throw new Error("Não foi possível salvar a foto na conta.");

      const avatar = publicAvatarUrl(path);
      if (!avatar) throw new Error("Não foi possível preparar a foto salva.");
      setPreferences((current) => ({
        ...current,
        avatar: `${avatar}?v=${Date.now()}`,
        avatarPath: path,
      }));
    },
    [remoteProfileEnabled, user?.id],
  );

  const removeAvatar = useCallback(async () => {
    const path = preferences.avatarPath;
    if (path && remoteProfileEnabled && supabase) {
      const { error } = await supabase.storage
        .from(avatarBucket)
        .remove([path]);
      if (error) throw new Error("Não foi possível remover a foto da conta.");
    }
    setPreferences((current) => ({
      ...current,
      avatar: null,
      avatarPath: null,
    }));
  }, [preferences.avatarPath, remoteProfileEnabled]);

  const isTourCompleted = useCallback(
    (path: string) => preferences.completedTourPaths.includes(path),
    [preferences.completedTourPaths],
  );

  const markTourCompleted = useCallback((path: string) => {
    setPreferences((current) =>
      current.completedTourPaths.includes(path)
        ? current
        : {
            ...current,
            completedTourPaths: [...current.completedTourPaths, path],
          },
    );
  }, []);

  const resetTour = useCallback((path: string) => {
    setPreferences((current) => ({
      ...current,
      completedTourPaths: current.completedTourPaths.filter(
        (completedPath) => completedPath !== path,
      ),
    }));
  }, []);

  const value: ProfileContextValue = {
    preferences,
    ready,
    setDisplayName,
    setAvatar,
    uploadAvatar,
    removeAvatar,
    isTourCompleted,
    markTourCompleted,
    resetTour,
    reset: () => setPreferences(defaultPreferences),
  };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context)
    throw new Error("useProfile precisa estar dentro de ProfileProvider.");
  return context;
}
