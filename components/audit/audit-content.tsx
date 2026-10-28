"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hash,
  Type,
  UserRound,
  Layers,
  CircleCheck,
  CalendarClock,
  CalendarCheck,
  X,
} from "lucide-react";
import { useProfile } from "@/components/profile/profile-provider";
import { Dialog } from "@base-ui/react/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  AuditLog,
  AuditActor,
  AuditPill,
  formatAuditTime,
  type AuditLogItem,
} from "@/components/ui/audit-log";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { isSupabaseConfigured } from "@/lib/supabase";

type AuditState = {
  scope: string;
  items: AuditLogItem[];
  error: string;
  loading: boolean;
  hasMore: boolean;
};
export function AuditContent() {
  const { session, user } = useAuth();
  const { preferences } = useProfile();
  const workspaceId = useActiveWorkspaceId();
  const scope = `${workspaceId}:${user?.id ?? ""}`;
  const router = useRouter();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<AuditState>({
    scope: "",
    items: [],
    error: "",
    loading: true,
    hasMore: false,
  });
  const [selected, setSelected] = useState<{
    scope: string;
    item: AuditLogItem;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setSelected(null);
    setState({ scope, items: [], error: "", loading: true, hasMore: false });
    if (!session?.access_token || !isSupabaseConfigured) {
      setState({
        scope,
        items: [],
        error:
          "A auditoria requer uma sessão de administrador com MFA e conexão ao banco do workspace.",
        loading: false,
        hasMore: false,
      });
      return () => controller.abort();
    }
    void (async () => {
      try {
        const response = await fetch(
          `/api/audit?workspaceId=${encodeURIComponent(workspaceId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? "Auditoria disponível somente para administradores com MFA."
              : (body.error ?? "Falha ao carregar a auditoria."),
          );
        if (!controller.signal.aborted)
          setState({
            scope,
            items: body.items ?? [],
            hasMore: Boolean(body.hasMore),
            loading: false,
            error: "",
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            scope,
            items: [],
            hasMore: false,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao carregar a auditoria.",
          });
      }
    })();
    return () => controller.abort();
  }, [scope, workspaceId, session?.access_token, refresh]);
  const current = state.scope === scope ? state : null;
  const detail = selected?.scope === scope ? selected.item : null;
  return (
    <DashboardShell
      activeSection="audit"
      title="Auditoria"
      headerAction={
        <button
          className="audit-refresh"
          type="button"
          onClick={() => setRefresh((v) => v + 1)}
          disabled={!session || Boolean(current?.loading)}
        >
          Atualizar histórico
        </button>
      }
    >
      <section className="surface-card audit-page">
        <h2>Histórico de operações</h2>
        <p className="audit-scope-note">
          Solicitações de campanhas e operações em grupos, modelos, páginas e
          perfis de envio deste workspace. Mostra o estado atual de cada
          solicitação, não cada transição. Não inclui acessos à conta, mudanças
          de usuários ou operações feitas diretamente em serviços externos.
        </p>
        <p className="audit-scope-note">
          Até 100 solicitações recentes de cada origem. Os filtros consultam
          apenas os registros carregados.
        </p>
        {current?.loading || !current ? (
          <p role="status">Carregando histórico…</p>
        ) : current.error ? (
          <p role="alert">{current.error}</p>
        ) : (
          <>
            {current.hasMore && (
              <p role="status">Há registros mais antigos fora deste recorte.</p>
            )}
            <AuditLog
              key={scope}
              items={current.items.map((item) => ({
                ...item,
                actorPhoto:
                  item.actor?.toLowerCase() === user?.email?.toLowerCase()
                    ? preferences.avatar
                    : item.actorPhoto,
              }))}
              onOpenRecord={(item) => {
                if (item.href) router.push(item.href);
              }}
              onReviewChange={(item) => setSelected({ scope, item })}
            />
          </>
        )}
      </section>
      <Dialog.Root
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="audit-dialog-backdrop" />
          <Dialog.Popup className="audit-detail-dialog">
            <div className="audit-detail-heading">
              <Dialog.Title>Detalhes da solicitação</Dialog.Title>
              <Dialog.Close aria-label="Fechar detalhes">
                <X size={18} aria-hidden="true" /> Fechar
              </Dialog.Close>
            </div>
            {detail && (
              <dl>
                {[
                  { label: "Registro", icon: Hash, value: detail.id },
                  { label: "Nome", icon: Type, value: detail.title },
                  {
                    label: "Responsável",
                    icon: UserRound,
                    value: (
                      <AuditActor
                        actor={detail.actor}
                        photo={detail.actorPhoto}
                      />
                    ),
                  },
                  {
                    label: "Tipo",
                    icon: Layers,
                    value: <AuditPill value={detail.type} />,
                  },
                  {
                    label: "Estado atual",
                    icon: CircleCheck,
                    value: <AuditPill value={detail.status} kind="status" />,
                  },
                  {
                    label: "Solicitada em",
                    icon: CalendarClock,
                    value: formatAuditTime(detail.timestamp),
                  },
                  {
                    label: "Finalizada em",
                    icon: CalendarCheck,
                    value: detail.finishedAt
                      ? formatAuditTime(detail.finishedAt)
                      : "Sem finalização registrada",
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <dt>
                      <row.icon size={16} aria-hidden="true" />
                      {row.label}
                    </dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardShell>
  );
}
