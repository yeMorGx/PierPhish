"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EVENTS,
  Joyride,
  STATUS,
  type EventData,
  type Step,
} from "react-joyride";
import { useAuth } from "@/components/auth/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase";

const tourStorageKey = "pierphish-product-tour-completed-v1";

const tourSteps: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Navegue pelo PierPhish",
    content:
      "Use esta barra para alternar entre visão geral, riscos, empresas, workspaces e configurações.",
    placement: "right",
  },
  {
    target: '[data-tour="header"]',
    title: "Ações rápidas",
    content:
      "O cabeçalho identifica a área atual e concentra busca, sincronização e ações contextuais.",
    placement: "bottom-start",
  },
  {
    target: '[data-tour="profile-menu"]',
    title: "Seu acesso",
    content:
      "Abra seu avatar para consultar notificações, trocar de workspace e acessar sua conta.",
    placement: "right",
  },
  {
    target: '[data-tour="dashboard-filter"]',
    title: "Leia o cenário certo",
    content:
      "Filtre o dashboard por empresa e acompanhe rapidamente taxa de cliques e imagens anexadas.",
    placement: "bottom",
  },
];

function finishTour(data: EventData) {
  return (
    data.type === EVENTS.TOUR_END ||
    data.status === STATUS.FINISHED ||
    data.status === STATUS.SKIPPED
  );
}

export function ProductTour() {
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    function startTour() {
      window.localStorage.removeItem(tourStorageKey);
      if (pathname === "/") {
        setRun(true);
        return;
      }
      window.location.assign("/");
    }

    window.addEventListener("pierphish:start-tour", startTour);
    return () => window.removeEventListener("pierphish:start-tour", startTour);
  }, [pathname]);

  useEffect(() => {
    if (!ready || pathname !== "/" || (isSupabaseConfigured && !user)) {
      setRun(false);
      return;
    }
    if (window.localStorage.getItem(tourStorageKey) === "true") return;

    const timeout = window.setTimeout(() => setRun(true), 900);
    return () => window.clearTimeout(timeout);
  }, [pathname, ready, user]);

  function handleEvent(data: EventData) {
    if (!finishTour(data)) return;
    window.localStorage.setItem(tourStorageKey, "true");
    setRun(false);
  }

  return (
    <Joyride
      continuous
      onEvent={handleEvent}
      options={{
        arrowColor: "var(--surface)",
        backgroundColor: "var(--surface)",
        closeButtonAction: "skip",
        overlayColor: "rgba(13, 21, 25, 0.72)",
        overlayClickAction: "close",
        primaryColor: "var(--accent)",
        spotlightPadding: 8,
        spotlightRadius: 18,
        showProgress: true,
        textColor: "var(--ink)",
        zIndex: 2000,
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        nextWithProgress: "Próximo ({current} de {total})",
        skip: "Pular tour",
      }}
      run={run}
      scrollToFirstStep
      steps={tourSteps}
      styles={{
        buttonBack: {
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
        },
        buttonClose: {
          color: "var(--muted-soft)",
        },
        buttonPrimary: {
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 800,
          padding: "9px 13px",
        },
        buttonSkip: {
          color: "var(--muted-soft)",
          fontSize: 11,
        },
        tooltip: {
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 18px 50px rgba(24, 32, 43, 0.18)",
          maxWidth: 360,
        },
        tooltipContent: {
          color: "var(--muted)",
          fontSize: 12,
          lineHeight: 1.55,
          padding: "5px 2px 12px",
        },
        tooltipTitle: {
          color: "var(--ink)",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          margin: "0 0 5px",
        },
      }}
    />
  );
}
