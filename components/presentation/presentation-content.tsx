"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PresentationSetup } from "@/components/presentation/presentation-setup";
import { buildPresentationData } from "@/components/presentation/presentation-data";
import { PresentationSlide } from "@/components/presentation/presentation-slides";
import type {
  PresentationPreferences,
  PresentationSlideId,
} from "@/components/presentation/presentation-types";
import { Icon } from "@/components/ui/icon";
import { demoCampaigns } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Campaign } from "@/components/dashboard/types";

gsap.registerPlugin(useGSAP);

const ALL_SLIDES: PresentationSlideId[] = ["overview", "campaigns", "risk"];
const PREFERENCES_KEY = "pierphish-presentation-preferences";

const defaultPreferences: PresentationPreferences = {
  selectedSlides: ALL_SLIDES,
  scrollEnabled: true,
  scrollSpeed: "medium",
  slideDuration: 20,
  autoSync: false,
  syncInterval: 60,
};

const scrollDurations = {
  fast: 7,
  medium: 13,
  slow: 20,
} as const;

const slideLabels: Record<PresentationSlideId, string> = {
  campaigns: "Campanhas",
  overview: "Panorama geral",
  risk: "Pessoas por risco",
};

function readPreferences(): PresentationPreferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_KEY) ?? "null",
    ) as Partial<PresentationPreferences> | null;
    if (!stored) return defaultPreferences;

    const selectedSlides = ALL_SLIDES.filter((slide) =>
      stored.selectedSlides?.includes(slide),
    );

    return {
      autoSync: stored.autoSync === true,
      scrollEnabled: stored.scrollEnabled !== false,
      scrollSpeed:
        stored.scrollSpeed === "slow" || stored.scrollSpeed === "fast"
          ? stored.scrollSpeed
          : "medium",
      selectedSlides: selectedSlides.length ? selectedSlides : ALL_SLIDES,
      slideDuration:
        stored.slideDuration === 8 || stored.slideDuration === 12
          ? stored.slideDuration
          : 20,
      syncInterval:
        stored.syncInterval === 30 || stored.syncInterval === 300
          ? stored.syncInterval
          : 60,
    };
  } catch {
    return defaultPreferences;
  }
}

function formatPresentationDate(value: string | null) {
  if (!value) return "Dados locais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Dados atualizados";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function PresentationContent() {
  const router = useRouter();
  const animationScopeRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);
  const slideViewportRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const [preferences, setPreferences] =
    useState<PresentationPreferences>(defaultPreferences);
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [presentationActive, setPresentationActive] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlides = preferences.selectedSlides;
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(selectedSlides.length - 1, 0),
  );
  const activeSlideId = selectedSlides[safeActiveIndex] ?? "overview";
  const data = useMemo(() => buildPresentationData(campaigns), [campaigns]);

  const loadCampaigns = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: nextCampaigns, error: queryError } = await supabase
      .from("beephish_campaigns")
      .select("id,name,status,launch_date,synced_at,stats")
      .order("launch_date", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setCampaigns((nextCampaigns ?? []) as Campaign[]);
    setLoading(false);
  }, []);

  const syncNow = useCallback(async () => {
    if (!supabase) return;

    setSyncing(true);
    setError(null);
    try {
      const { error: syncError } = await supabase.functions.invoke(
        "sync-beephish",
        { body: {} },
      );
      await loadCampaigns();
      if (syncError) setError(syncError.message);
    } finally {
      setSyncing(false);
    }
  }, [loadCampaigns]);

  useEffect(() => {
    setPreferences(readPreferences());
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (activeIndex !== safeActiveIndex) setActiveIndex(safeActiveIndex);
  }, [activeIndex, safeActiveIndex]);

  useEffect(() => {
    if (!presentationActive || selectedSlides.length < 2) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % selectedSlides.length);
    }, preferences.slideDuration * 1000);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    presentationActive,
    preferences.slideDuration,
    selectedSlides.length,
  ]);

  useEffect(() => {
    if (!presentationActive || !preferences.autoSync || !supabase) return;
    const timer = window.setInterval(
      () => void syncNow(),
      preferences.syncInterval * 1000,
    );
    return () => window.clearInterval(timer);
  }, [
    presentationActive,
    preferences.autoSync,
    preferences.syncInterval,
    syncNow,
  ]);

  useEffect(() => {
    if (!presentationActive) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [presentationActive]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!presentationActive) return;
      if (event.key === "Escape") {
        event.preventDefault();
        exitPresentation();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % selectedSlides.length);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex(
          (current) =>
            (current - 1 + selectedSlides.length) % selectedSlides.length,
        );
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [presentationActive, selectedSlides.length]);

  const { contextSafe } = useGSAP(() => undefined, {
    scope: animationScopeRef,
  });

  const startPresentation = contextSafe(() => {
    if (!selectedSlides.length || launching) return;

    setLaunching(true);
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !setupRef.current
    ) {
      setPresentationActive(true);
      setLaunching(false);
      return;
    }

    gsap.to(setupRef.current, {
      autoAlpha: 0,
      duration: 0.46,
      ease: "power3.inOut",
      onComplete: () => {
        setPresentationActive(true);
        setLaunching(false);
      },
      scale: 0.985,
      y: 20,
    });
  });

  const exitPresentation = contextSafe(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !presentationRef.current
    ) {
      router.push("/");
      return;
    }

    gsap.to(presentationRef.current, {
      autoAlpha: 0,
      duration: 0.38,
      ease: "power3.in",
      onComplete: () => router.push("/"),
      scale: 0.985,
      y: 18,
    });
  });

  useGSAP(
    () => {
      if (
        !presentationActive ||
        !slideViewportRef.current ||
        !slideContentRef.current
      )
        return;

      const viewport = slideViewportRef.current;
      const content = slideContentRef.current;
      viewport.scrollTop = 0;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const intro = gsap.fromTo(
        content,
        { autoAlpha: 0, filter: "blur(5px)", x: 26 },
        {
          autoAlpha: 1,
          clearProps: "filter,opacity,transform,visibility",
          duration: 0.55,
          ease: "power3.out",
          filter: "blur(0px)",
          x: 0,
        },
      );

      if (!preferences.scrollEnabled) return () => intro.kill();

      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (maxScroll <= 0) return () => intro.kill();

      let scrollTween: gsap.core.Tween | undefined;
      const startTimer = window.setTimeout(() => {
        scrollTween = gsap.to(viewport, {
          scrollTop: maxScroll,
          duration: scrollDurations[preferences.scrollSpeed],
          ease: "sine.inOut",
        });
      }, 1200);

      return () => {
        window.clearTimeout(startTimer);
        intro.kill();
        scrollTween?.kill();
      };
    },
    {
      dependencies: [
        activeSlideId,
        campaigns.length,
        preferences.scrollEnabled,
        preferences.scrollSpeed,
        presentationActive,
      ],
      revertOnUpdate: true,
      scope: presentationRef,
    },
  );

  function updatePreferences(update: Partial<PresentationPreferences>) {
    setPreferences((current) => ({ ...current, ...update }));
  }

  function selectSlide(slide: PresentationSlideId) {
    setPreferences((current) => {
      const selected = current.selectedSlides.includes(slide);
      const selectedSlides = selected
        ? current.selectedSlides.filter(
            (currentSlide) => currentSlide !== slide,
          )
        : [...current.selectedSlides, slide];
      return selectedSlides.length ? { ...current, selectedSlides } : current;
    });
  }

  function moveSlide(direction: 1 | -1) {
    setActiveIndex(
      (current) =>
        (current + direction + selectedSlides.length) % selectedSlides.length,
    );
  }

  return (
    <div ref={animationScopeRef}>
      <div ref={setupRef}>
        <DashboardShell activeSection="presentation" title="Apresentação">
          <div className="presentation-setup-status" aria-live="polite">
            {error ? <span>{error}</span> : null}
            {loading ? <span>Buscando as campanhas mais recentes…</span> : null}
          </div>
          <PresentationSetup
            campaignCount={data.totals.campaigns}
            onAutoSyncChange={(autoSync) => updatePreferences({ autoSync })}
            onScrollEnabledChange={(scrollEnabled) =>
              updatePreferences({ scrollEnabled })
            }
            onScrollSpeedChange={(scrollSpeed) =>
              updatePreferences({ scrollSpeed })
            }
            onSelectSlide={selectSlide}
            onSlideDurationChange={(slideDuration) =>
              updatePreferences({ slideDuration })
            }
            onStart={startPresentation}
            onSyncIntervalChange={(syncInterval) =>
              updatePreferences({ syncInterval })
            }
            preferences={preferences}
            syncing={syncing}
          />
        </DashboardShell>
      </div>

      {presentationActive && (
        <div className="presentation-mode theme-canvas" ref={presentationRef}>
          <div className="presentation-topbar">
            <div className="presentation-topbar-brand">
              <span className="presentation-brand-mark">P</span>
              <span>
                <strong>PierPhish</strong>
                <small>Modo apresentação</small>
              </span>
            </div>
            <div className="presentation-topbar-status">
              <span className="presentation-live-dot" />
              <span>
                {safeActiveIndex + 1} / {selectedSlides.length}
              </span>
              <i />
              <span>{formatPresentationDate(data.latestSync)}</span>
            </div>
          </div>

          <div
            aria-label={`Slide ${safeActiveIndex + 1}: ${slideLabels[activeSlideId]}`}
            className="presentation-slide-viewport"
            ref={slideViewportRef}
          >
            <div className="presentation-slide-content" ref={slideContentRef}>
              <PresentationSlide data={data} slideId={activeSlideId} />
            </div>
          </div>

          <div
            aria-label="Controles da apresentação"
            className="presentation-toolbar"
            role="toolbar"
          >
            <button
              aria-label="Sair da apresentação"
              className="presentation-toolbar-button presentation-exit-button"
              onClick={exitPresentation}
              type="button"
            >
              <Icon name="logout" size={16} />
              <span>Sair da apresentação</span>
            </button>
            <span className="presentation-toolbar-divider" />
            <label className="presentation-toolbar-toggle">
              <input
                checked={preferences.scrollEnabled}
                onChange={(event) =>
                  updatePreferences({ scrollEnabled: event.target.checked })
                }
                type="checkbox"
              />
              <span>Scroll automático</span>
              <i aria-hidden="true" />
            </label>
            <label className="presentation-toolbar-select">
              <span>Scroll</span>
              <select
                aria-label="Velocidade do scroll"
                value={preferences.scrollSpeed}
                onChange={(event) =>
                  updatePreferences({
                    scrollSpeed: event.target
                      .value as PresentationPreferences["scrollSpeed"],
                  })
                }
              >
                <option value="slow">Lento</option>
                <option value="medium">Médio</option>
                <option value="fast">Rápido</option>
              </select>
            </label>
            <label className="presentation-toolbar-select">
              <span>Slides</span>
              <select
                aria-label="Velocidade dos slides"
                value={preferences.slideDuration}
                onChange={(event) =>
                  updatePreferences({
                    slideDuration: Number(
                      event.target.value,
                    ) as PresentationPreferences["slideDuration"],
                  })
                }
              >
                <option value="8">8 s</option>
                <option value="12">12 s</option>
                <option value="20">20 s</option>
              </select>
            </label>
            <label className="presentation-toolbar-toggle presentation-toolbar-sync">
              <input
                checked={preferences.autoSync}
                onChange={(event) =>
                  updatePreferences({ autoSync: event.target.checked })
                }
                type="checkbox"
              />
              <span>Sincronização automática</span>
              <i aria-hidden="true" />
            </label>
            {preferences.autoSync && (
              <select
                aria-label="Intervalo de sincronização"
                className="presentation-toolbar-interval"
                value={preferences.syncInterval}
                onChange={(event) =>
                  updatePreferences({
                    syncInterval: Number(
                      event.target.value,
                    ) as PresentationPreferences["syncInterval"],
                  })
                }
              >
                <option value="30">30 s</option>
                <option value="60">1 min</option>
                <option value="300">5 min</option>
              </select>
            )}
            <button
              aria-label="Atualizar informações agora"
              className="presentation-toolbar-button presentation-sync-button"
              disabled={syncing || !supabase}
              onClick={() => void syncNow()}
              type="button"
            >
              <Icon name="refresh" size={15} />
              <span>{syncing ? "Atualizando…" : "Atualizar agora"}</span>
            </button>
            <span className="presentation-toolbar-divider presentation-toolbar-divider-last" />
            <div className="presentation-slide-controls">
              <button
                aria-label="Slide anterior"
                className="presentation-slide-control"
                onClick={() => moveSlide(-1)}
                type="button"
              >
                ←
              </button>
              <span>{slideLabels[activeSlideId]}</span>
              <button
                aria-label="Próximo slide"
                className="presentation-slide-control"
                onClick={() => moveSlide(1)}
                type="button"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
