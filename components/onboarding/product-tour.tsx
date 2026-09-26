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
import { useProfile } from "@/components/profile/profile-provider";
import { isSupabaseConfigured } from "@/lib/supabase";

const tourStorageKey = "pierphish-product-tour-completed-v2";

const commonTourSteps: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Navegue pelo PierPhish",
    content:
      "Use esta barra para alternar entre visão geral, riscos, empresas, campanhas e configurações.",
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
];

const pageTourSteps: Record<string, Step[]> = {
  "/": [
    {
      target: '[data-tour="dashboard-filter"]',
      title: "Leia o cenário certo",
      content:
        "Filtre o dashboard por empresa e mantenha a leitura concentrada no cenário que importa.",
      placement: "bottom",
    },
    {
      target: '[data-tour="dashboard-content"]',
      title: "Acompanhe o desempenho",
      content:
        "Os cards e gráficos consolidam campanhas, pessoas, entregas, cliques e relatos do workspace ativo.",
      placement: "top",
    },
  ],
  "/riscos": [
    {
      target: '[data-tour="risk-content"]',
      title: "Priorize o risco humano",
      content:
        "Esta visão reúne os sinais observados nas campanhas para orientar a investigação e a resposta.",
      placement: "top",
    },
    {
      target: '[data-tour="risk-people"]',
      title: "Investigue cada pessoa",
      content:
        "Use busca e filtros para encontrar pessoas, entender os sinais e abrir os detalhes do comportamento.",
      placement: "top",
    },
  ],
  "/empresas": [
    {
      target: '[data-tour="companies-content"]',
      title: "Conecte os clientes",
      content:
        "Gerencie as conexões BeePhish que abastecem as campanhas do workspace selecionado.",
      placement: "top",
    },
    {
      target: '[data-tour="companies-clients"]',
      title: "Edite cada cliente",
      content:
        "Adicione, personalize e revise logo, nome, informações e credenciais de cada cliente.",
      placement: "top",
    },
  ],
  "/workspaces": [
    {
      target: '[data-tour="workspaces-content"]',
      title: "Separe cada operação",
      content:
        "Crie ambientes de teste e produção para manter dados, conexões e pessoas no contexto certo.",
      placement: "top",
    },
    {
      target: '[data-tour="workspace-list"]',
      title: "Escolha o ambiente ativo",
      content:
        "Troque o workspace pela lista e use o painel ao lado para personalizar o ambiente e administrar participantes.",
      placement: "top",
    },
  ],
  "/configuracoes": [
    {
      target: '[data-tour="settings-tabs"]',
      title: "Organize suas preferências",
      content:
        "As abas reúnem conta, usuários, estilo visual e status do ambiente em um só lugar.",
      placement: "bottom",
    },
    {
      target: '[data-tour="settings-content"]',
      title: "Personalize a experiência",
      content:
        "Atualize seu perfil, escolha a aparência do dashboard e ajuste as opções de acessibilidade.",
      placement: "top",
    },
  ],
  "/usuarios": [
    {
      target: '[data-tour="users-content"]',
      title: "Administre acessos",
      content:
        "Crie contas internas, defina o nível de acesso e associe cada pessoa aos workspaces corretos.",
      placement: "top",
    },
    {
      target: '[data-tour="users-form"]',
      title: "Crie ou convide alguém",
      content:
        "Use os formulários para criar um usuário ou liberar um workspace para uma conta já cadastrada.",
      placement: "top",
    },
    {
      target: '[data-tour="users-list"]',
      title: "Acompanhe as permissões",
      content:
        "A lista mostra os workspaces, cargos, status e ações disponíveis para cada usuário.",
      placement: "top",
    },
  ],
  "/status": [
    {
      target: '[data-tour="status-content"]',
      title: "Verifique o ambiente",
      content:
        "Use o status para entender se a conexão, a leitura das campanhas e os dados do workspace estão disponíveis.",
      placement: "top",
    },
    {
      target: '[data-tour="status-metrics"]',
      title: "Veja os indicadores",
      content:
        "As métricas resumem campanhas, pessoas, entregas e aberturas para uma checagem rápida.",
      placement: "top",
    },
  ],
  "/apresentacao": [
    {
      target: '[data-tour="presentation-content"]',
      title: "Prepare uma apresentação",
      content:
        "Monte uma leitura guiada com os slides que fazem sentido para a reunião ou para o documento.",
      placement: "top",
    },
    {
      target: '[data-tour="presentation-slides"]',
      title: "Escolha o roteiro",
      content:
        "Selecione panorama, campanhas e risco humano. Depois ajuste ritmo, rolagem e sincronização.",
      placement: "top",
    },
  ],
  "/campaigns/[id]": [
    {
      target: '[data-tour="campaign-content"]',
      title: "Leia uma campanha",
      content:
        "Aqui você encontra o resumo, a situação da campanha e os sinais registrados por pessoa.",
      placement: "top",
    },
    {
      target: '[data-tour="campaign-evidence"]',
      title: "Consulte a evidência",
      content:
        "Anexe, visualize e revise o exemplo original do e-mail usado na campanha, incluindo imagens e anexos.",
      placement: "bottom",
    },
    {
      target: '[data-tour="campaign-people"]',
      title: "Entenda cada interação",
      content:
        "Filtre pessoas por abertura, clique ou relato e acompanhe a atividade recente.",
      placement: "top",
    },
  ],
};

function normalizeTourPath(pathname: string) {
  return pathname.startsWith("/campaigns/") ? "/campaigns/[id]" : pathname;
}

function stepsForPath(pathname: string) {
  const pagePath = normalizeTourPath(pathname);
  return pageTourSteps[pagePath]
    ? [...commonTourSteps, ...pageTourSteps[pagePath]]
    : [];
}

function storageKeyForPath(pathname: string) {
  return `${tourStorageKey}:${normalizeTourPath(pathname)}`;
}

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
  const {
    ready: profileReady,
    isTourCompleted,
    markTourCompleted,
    resetTour,
  } = useProfile();
  const [run, setRun] = useState(false);
  const [activeSteps, setActiveSteps] = useState<Step[]>([]);
  const steps = stepsForPath(pathname);
  const pageStorageKey = storageKeyForPath(pathname);

  function stepsMountedInPage() {
    return steps.filter((step) => {
      if (typeof step.target !== "string") return true;
      return Boolean(document.querySelector(step.target));
    });
  }

  useEffect(() => {
    function startTour() {
      if (!steps.length) {
        window.location.assign("/");
        return;
      }
      const nextSteps = stepsMountedInPage();
      if (!nextSteps.length) return;
      resetTour(pageStorageKey);
      setActiveSteps(nextSteps);
      setRun(false);
      window.requestAnimationFrame(() => setRun(true));
    }

    window.addEventListener("pierphish:start-tour", startTour);
    return () => window.removeEventListener("pierphish:start-tour", startTour);
  }, [pageStorageKey, pathname, resetTour, steps.length]);

  useEffect(() => {
    setRun(false);
    setActiveSteps([]);
    if (
      !ready ||
      !profileReady ||
      !steps.length ||
      (isSupabaseConfigured && !user)
    ) {
      return;
    }
    if (isTourCompleted(pageStorageKey)) return;

    const timeout = window.setTimeout(() => {
      const nextSteps = stepsMountedInPage();
      if (!nextSteps.length) return;
      setActiveSteps(nextSteps);
      setRun(true);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [
    isTourCompleted,
    pageStorageKey,
    pathname,
    profileReady,
    ready,
    steps.length,
    user,
  ]);

  function handleEvent(data: EventData) {
    if (!finishTour(data)) return;
    markTourCompleted(pageStorageKey);
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
      run={run && activeSteps.length > 0}
      scrollToFirstStep
      steps={activeSteps}
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
