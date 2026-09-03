"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreferences = {
  canvas: string;
  backgroundImage: string | null;
};

type ThemeContextValue = {
  preferences: ThemePreferences;
  setCanvas: (canvas: string) => void;
  setBackgroundImage: (image: string | null) => void;
  reset: () => void;
};

const defaultPreferences: ThemePreferences = {
  canvas: "#f4f4f4",
  backgroundImage: null,
};
const storageKey = "pierphish-theme-preferences";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isValidCanvas(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isValidBackgroundImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"))
  );
}

function cssImage(value: string | null) {
  if (!value) return "none";
  const safeValue = value.replace(/["\\\n\r)]/g, "");
  return `url("${safeValue}")`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] =
    useState<ThemePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<ThemePreferences>;
      setPreferences({
        canvas: isValidCanvas(parsed.canvas)
          ? parsed.canvas
          : defaultPreferences.canvas,
        backgroundImage: isValidBackgroundImage(parsed.backgroundImage)
          ? parsed.backgroundImage
          : null,
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--canvas", preferences.canvas);
    document.documentElement.style.setProperty(
      "--canvas-image",
      cssImage(preferences.backgroundImage),
    );
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences]);

  const value: ThemeContextValue = {
    preferences,
    setCanvas: (canvas) => {
      if (isValidCanvas(canvas))
        setPreferences((current) => ({ ...current, canvas }));
    },
    setBackgroundImage: (backgroundImage) => {
      if (backgroundImage === null || isValidBackgroundImage(backgroundImage))
        setPreferences((current) => ({ ...current, backgroundImage }));
    },
    reset: () => setPreferences(defaultPreferences),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useTheme precisa estar dentro de ThemeProvider.");
  return context;
}
