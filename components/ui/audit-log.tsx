"use client";

import { useMemo, useState } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Copy, ExternalLink, FileSearch, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AuditLogItem } from "@/lib/audit-types";
export type { AuditLogItem } from "@/lib/audit-types";

export function AuditActor({
  actor,
  photo,
}: {
  actor?: string;
  photo?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="audit-actor">
      <span className="audit-actor-photo">
        {photo && !failed ? (
          <img src={photo} alt="" onError={() => setFailed(true)} />
        ) : (
          <span aria-hidden="true">
            {actor?.slice(0, 1).toUpperCase() || "?"}
          </span>
        )}
      </span>
      {actor || "Responsável não informado"}
    </span>
  );
}
export function AuditPill({
  value,
  kind = "type",
}: {
  value?: string;
  kind?: "type" | "status";
}) {
  const tone =
    kind === "type"
      ? "info"
      : value === "Concluída"
        ? "success"
        : value === "Falhou"
          ? "danger"
          : value === "Expirada"
            ? "neutral"
            : "warning";
  return (
    <span className="audit-pill" data-tone={tone}>
      {value || "Não informado"}
    </span>
  );
}
function formatTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(time)
    : "Data não informada";
}
export { formatTime as formatAuditTime };

export function AuditLog({
  items,
  enableFilters = true,
  onOpenRecord,
  onReviewChange,
  className = "",
}: {
  items: AuditLogItem[];
  enableFilters?: boolean;
  onOpenRecord?: (item: AuditLogItem) => void;
  onReviewChange?: (item: AuditLogItem) => void;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const options = (key: "actor" | "type" | "status") =>
    [
      ...new Set(
        items.map((i) => i[key]).filter((v): v is string => Boolean(v)),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (!actor || i.actor === actor) &&
          (!type || i.type === type) &&
          (!status || i.status === status) &&
          [i.title, i.description, i.actor, i.type, i.status]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(search.trim().toLocaleLowerCase("pt-BR")),
      ),
    [items, actor, type, status, search],
  );
  const pages = Math.max(1, Math.ceil(visible.length / 12));
  const current = Math.min(page, pages - 1);
  async function copy(item: AuditLogItem) {
    try {
      await navigator.clipboard.writeText(item.id);
      toast.success("ID copiado.");
    } catch {
      toast.error(
        "Não foi possível copiar. Abra os detalhes para selecionar o ID.",
      );
    }
  }
  const actions = (item: AuditLogItem) => (
    <>
      {onOpenRecord && (
        <ContextMenu.Item onClick={() => onOpenRecord(item)}>
          <ExternalLink size={14} />
          Abrir origem
        </ContextMenu.Item>
      )}
      {onReviewChange && (
        <ContextMenu.Item onClick={() => onReviewChange(item)}>
          <FileSearch size={14} />
          Ver detalhes
        </ContextMenu.Item>
      )}
      <ContextMenu.Item onClick={() => void copy(item)}>
        <Copy size={14} />
        Copiar ID do registro
      </ContextMenu.Item>
    </>
  );
  return (
    <div className={`audit-log ${className}`}>
      {enableFilters && (
        <div className="audit-filters">
          <label>
            Buscar
            <input
              type="search"
              placeholder="Buscar no histórico carregado"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {(
            [
              {
                key: "actor",
                label: "Responsável",
                value: actor,
                set: setActor,
              },
              { key: "type", label: "Tipo", value: type, set: setType },
              { key: "status", label: "Estado", value: status, set: setStatus },
            ] as const
          ).map((field) => (
            <label key={field.key}>
              {field.label}
              <select
                value={field.value}
                onChange={(e) => {
                  field.set(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todos</option>
                {options(field.key).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
          {(search || actor || type || status) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActor("");
                setType("");
                setStatus("");
                setPage(0);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
      <p className="audit-result-count" aria-live="polite">
        {visible.length} registro(s) no histórico carregado · horários de
        Brasília
      </p>
      <ol className="audit-timeline">
        {visible.slice(current * 12, (current + 1) * 12).map((item) => (
          <ContextMenu.Root key={item.id}>
            <ContextMenu.Trigger
              render={<li />}
              className="audit-entry"
              tabIndex={0}
            >
              <div className="audit-entry-main">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <div className="audit-entry-tags">
                  <AuditActor actor={item.actor} photo={item.actorPhoto} />
                  <AuditPill value={item.type} />
                  <AuditPill value={item.status} kind="status" />
                </div>
              </div>
              <div className="audit-entry-meta">
                <time dateTime={item.timestamp}>
                  {formatTime(item.timestamp)}
                </time>
                <button
                  type="button"
                  aria-label={`Ver detalhes de ${item.title}`}
                  onClick={() => onReviewChange?.(item)}
                  disabled={!onReviewChange}
                >
                  <MoreHorizontal size={18} aria-hidden="true" />
                </button>
              </div>
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Positioner>
                <ContextMenu.Popup className="audit-context-menu">
                  {actions(item)}
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        ))}
      </ol>
      {!visible.length && (
        <p className="audit-empty">Nenhum registro corresponde aos filtros.</p>
      )}
      {pages > 1 && (
        <nav className="audit-pagination" aria-label="Páginas da auditoria">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </button>
          <span aria-live="polite">
            {current + 1} de {pages}
          </span>
          <button
            type="button"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}
export default AuditLog;
