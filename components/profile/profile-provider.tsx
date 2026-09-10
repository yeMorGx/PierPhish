"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export type ProfilePreferences = {
  displayName: string;
  avatar: string | null;
};

type ProfileContextValue = {
  preferences: ProfilePreferences;
  setDisplayName: (displayName: string) => void;
  setAvatar: (avatar: string | null) => void;
  reset: () => void;
};

const defaultPreferences: ProfilePreferences = {
  displayName: "",
  avatar: null,
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
    value.length <= 4_500_000 &&
    /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)
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
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = storageKeyFor(user?.id ?? null, user?.email ?? null);
  const [preferences, setPreferences] =
    useState<ProfilePreferences>(defaultPreferences);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    setLoadedKey(null);
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      setPreferences(defaultPreferences);
      setLoadedKey(storageKey);
      return;
    }

    try {
      setPreferences(normalizePreferences(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(storageKey);
      setPreferences(defaultPreferences);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // A foto continua disponível nesta sessão mesmo se o storage estiver cheio.
    }
  }, [loadedKey, preferences, storageKey]);

  const value: ProfileContextValue = {
    preferences,
    setDisplayName: (displayName) =>
      setPreferences((current) => ({
        ...current,
        displayName: displayName.slice(0, 48),
      })),
    setAvatar: (avatar) =>
      setPreferences((current) => ({
        ...current,
        avatar:
          avatar === null || isValidAvatar(avatar) ? avatar : current.avatar,
      })),
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
