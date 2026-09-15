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
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type NotificationRecord = {
  action_path: string | null;
  created_at: string;
  id: string;
  message: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  title: string;
  type: string;
  workspace_id: string | null;
};

type NotificationContextValue = {
  closePanel: () => void;
  dismissToast: () => void;
  hasUnread: boolean;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  notifications: NotificationRecord[];
  notificationPanelOpen: boolean;
  openPanel: () => void;
  toast: NotificationRecord | null;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNotification(value: unknown): NotificationRecord | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.title !== "string" || typeof value.message !== "string") {
    return null;
  }
  return {
    action_path:
      typeof value.action_path === "string" ? value.action_path : null,
    created_at:
      typeof value.created_at === "string"
        ? value.created_at
        : new Date().toISOString(),
    id: value.id,
    message: value.message,
    metadata: isRecord(value.metadata) ? value.metadata : {},
    read_at: typeof value.read_at === "string" ? value.read_at : null,
    title: value.title,
    type: typeof value.type === "string" ? value.type : "system",
    workspace_id:
      typeof value.workspace_id === "string" ? value.workspace_id : null,
  };
}

function notificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notificationLabel(notification: NotificationRecord) {
  if (notification.type === "workspace_invite") return "Workspace";
  if (notification.type === "security") return "Segurança";
  return "Atualização";
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [toast, setToast] = useState<NotificationRecord | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((notification: NotificationRecord) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(notification);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 5000);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) {
      knownIdsRef.current = new Set();
      initializedRef.current = false;
      setNotifications([]);
      setNotificationPanelOpen(false);
      dismissToast();
      return;
    }

    let disposed = false;
    const client = supabase;
    const userId = user.id;
    knownIdsRef.current = new Set();
    initializedRef.current = false;

    async function loadNotifications(announceNew = false) {
      const { data, error } = await client
        .from("pierphish_notifications")
        .select(
          "id,recipient_user_id,workspace_id,type,title,message,action_path,metadata,read_at,created_at",
        )
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (disposed || error) return;

      const next = (data ?? [])
        .map(normalizeNotification)
        .filter((item): item is NotificationRecord => item !== null);
      const newItems = next.filter(
        (notification) => !knownIdsRef.current.has(notification.id),
      );
      knownIdsRef.current = new Set(
        next.map((notification) => notification.id),
      );
      setNotifications(next);
      if (announceNew && initializedRef.current && newItems[0]) {
        showToast(newItems[0]);
      }
      initializedRef.current = true;
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications(true);
    }, 15000);
    const channel = client
      .channel(`pierphish-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pierphish_notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = normalizeNotification(payload.new);
          if (!notification || knownIdsRef.current.has(notification.id)) return;
          knownIdsRef.current.add(notification.id);
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id),
          ]);
          showToast(notification);
        },
      )
      .subscribe();

    return () => {
      disposed = true;
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [dismissToast, showToast, user]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!supabase || !user) return;
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: readAt }
            : notification,
        ),
      );
      await supabase
        .from("pierphish_notifications")
        .update({ read_at: readAt })
        .eq("id", id)
        .eq("recipient_user_id", user.id);
    },
    [user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!supabase || !user) return;
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read_at: readAt })),
    );
    await supabase
      .from("pierphish_notifications")
      .update({ read_at: readAt })
      .eq("recipient_user_id", user.id)
      .is("read_at", null);
  }, [user]);

  const value: NotificationContextValue = {
    closePanel: () => setNotificationPanelOpen(false),
    dismissToast,
    hasUnread: notifications.some((notification) => !notification.read_at),
    markAllAsRead,
    markAsRead,
    notifications,
    notificationPanelOpen,
    openPanel: () => setNotificationPanelOpen(true),
    toast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications precisa estar dentro de NotificationProvider.",
    );
  }
  return context;
}

export function NotificationCenter() {
  const {
    closePanel,
    dismissToast,
    markAllAsRead,
    markAsRead,
    notifications,
    notificationPanelOpen,
    toast,
  } = useNotifications();

  useEffect(() => {
    if (!notificationPanelOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePanel, notificationPanelOpen]);

  return (
    <>
      {notificationPanelOpen && (
        <>
          <button
            aria-label="Fechar notificações"
            className="notification-drawer-backdrop"
            onClick={closePanel}
            type="button"
          />
          <aside
            aria-labelledby="notification-panel-title"
            aria-modal="true"
            className="notification-drawer"
            role="dialog"
          >
            <header className="notification-panel-header">
              <div>
                <p className="notification-panel-kicker">CENTRAL DE AVISOS</p>
                <h2 id="notification-panel-title">Notificações</h2>
                <p>Convites e atualizações importantes do PierPhish.</p>
              </div>
              <button
                aria-label="Fechar notificações"
                className="notification-panel-close"
                onClick={closePanel}
                type="button"
              >
                <Icon name="close" size={17} />
              </button>
            </header>

            <div className="notification-panel-actions">
              <span>{notifications.length} avisos</span>
              <button onClick={() => void markAllAsRead()} type="button">
                Marcar todas como lidas
              </button>
            </div>

            <div className="notification-list">
              {notifications.length ? (
                notifications.map((notification) => (
                  <button
                    className={`notification-item ${notification.read_at ? "" : "is-unread"}`}
                    key={notification.id}
                    onClick={() => void markAsRead(notification.id)}
                    type="button"
                  >
                    <span className="notification-item-marker" />
                    <span className="notification-item-copy">
                      <span className="notification-item-meta">
                        <span>{notificationLabel(notification)}</span>
                        <time dateTime={notification.created_at}>
                          {notificationDate(notification.created_at)}
                        </time>
                      </span>
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                    </span>
                    {!notification.read_at && (
                      <span className="notification-item-unread">Nova</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="notification-empty-state">
                  <span>
                    <Icon name="bell" size={20} />
                  </span>
                  <strong>Tudo em dia</strong>
                  <p>As novas mensagens aparecerão aqui.</p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {toast && (
        <aside aria-live="polite" className="notification-toast" role="status">
          <span className="notification-toast-mark">
            <Icon name="bell" size={17} />
          </span>
          <span className="notification-toast-copy">
            <span>Nova notificação</span>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </span>
          <button
            aria-label="Fechar aviso"
            className="notification-toast-close"
            onClick={dismissToast}
            type="button"
          >
            <Icon name="close" size={14} />
          </button>
        </aside>
      )}
    </>
  );
}
