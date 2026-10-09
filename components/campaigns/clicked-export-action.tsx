type ClickedExportActionProps = {
  available: boolean;
  busy: boolean;
  onExport: () => void;
};

export function ClickedExportAction({
  available,
  busy,
  onExport,
}: ClickedExportActionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 max-w-[44rem] text-[13px] leading-relaxed text-[var(--text-muted)]">
        {available
          ? "A planilha reúne todos os clicados desta campanha, mesmo quando a lista está filtrada."
          : "A extração fica disponível para campanhas sincronizadas."}
      </p>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--line)] bg-transparent px-4 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={!available || busy}
        onClick={onExport}
      >
        {busy ? "Gerando planilha…" : "Extrair clicados · Excel"}
      </button>
    </div>
  );
}
