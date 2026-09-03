"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/components/theme/theme-provider";

const colorPresets = [
  ["Cinza atual", "#f4f4f4"],
  ["Azul névoa", "#edf3f5"],
  ["Areia clara", "#f3f0ea"],
  ["Verde suave", "#eef3ed"],
  ["Lavanda", "#f0eff5"],
] as const;

function SettingsContent() {
  const { preferences, reset, setBackgroundImage, setCanvas } = useTheme();
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.backgroundImage?.startsWith("http"))
      setImageUrl(preferences.backgroundImage);
  }, [preferences.backgroundImage]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setError("Escolha uma imagem de até 2,5 MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBackgroundImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function applyImageUrl() {
    const value = imageUrl.trim();
    if (!value) {
      setBackgroundImage(null);
      setError(null);
      return;
    }
    if (!/^https?:\/\//i.test(value)) {
      setError("Use uma URL pública iniciando com http:// ou https://.");
      return;
    }
    setError(null);
    setBackgroundImage(value);
  }

  function restoreDefaults() {
    reset();
    setImageUrl("");
    setError(null);
  }

  return (
    <DashboardShell activeSection="settings" title="Configurações">
      <div className="mx-auto grid max-w-[1180px] gap-[var(--cards-gap)] pb-8">
        <section className="rounded-[var(--radius-card)] bg-[var(--surface)] p-8 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px] max-[720px]:p-6">
          <div className="max-w-[620px]">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              APARÊNCIA
            </p>
            <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-none font-[680] tracking-[-0.07em]">
              Ajuste o campo de trabalho.
            </h2>
            <p className="mt-4 mb-0 text-[13px] leading-relaxed text-[#7b838d]">
              Escolha uma cor ou imagem para o fundo cinza do Lens. A
              preferência é salva neste navegador e não altera os dados das
              campanhas.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)] gap-[var(--cards-gap)] max-[820px]:grid-cols-1">
          <article className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                  COR DO FUNDO
                </p>
                <h3 className="m-0 text-[18px] font-bold tracking-[-0.04em]">
                  Uma base mais sua
                </h3>
              </div>
              <Icon name="palette" size={20} />
            </div>
            <label className="mt-6 flex items-center gap-3 rounded-[15px] border border-[#edf0f1] bg-[#fafbfb] p-3">
              <input
                className="size-12 cursor-pointer rounded-[11px] border-0 bg-transparent p-0"
                type="color"
                value={preferences.canvas}
                onChange={(event) => setCanvas(event.target.value)}
                aria-label="Escolher cor do fundo"
              />
              <span>
                <strong className="block text-[12px] text-[#34404a]">
                  {preferences.canvas.toUpperCase()}
                </strong>
                <span className="mt-1 block text-[10px] text-[#87919a]">
                  Aplicado imediatamente.
                </span>
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {colorPresets.map(([label, color]) => (
                <button
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold transition-colors ${preferences.canvas === color ? "border-[#18202b] text-[#18202b]" : "border-[#e5e9ea] text-[#7d8790] hover:border-[#aab5bb]"}`}
                  type="button"
                  key={color}
                  onClick={() => setCanvas(color)}
                >
                  <span
                    className="size-3 rounded-full border border-black/5"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                  IMAGEM DO FUNDO
                </p>
                <h3 className="m-0 text-[18px] font-bold tracking-[-0.04em]">
                  Textura ou fotografia
                </h3>
              </div>
              <Icon name="image" size={20} />
            </div>
            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-[15px] border border-dashed border-[#dce3e5] bg-[#fafbfb] p-4 transition-colors hover:border-[#9aadb7]">
              <span className="grid size-10 place-items-center rounded-[12px] bg-[#edf2f3] text-[#627b87]">
                <Icon name="image" size={18} />
              </span>
              <span>
                <strong className="block text-[12px] text-[#34404a]">
                  Escolher imagem do dispositivo
                </strong>
                <span className="mt-1 block text-[10px] text-[#87919a]">
                  PNG, JPG ou WEBP · até 2,5 MB
                </span>
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-[11px] border border-[#e3e6e7] bg-[#fbfcfc] px-3 text-[11px] text-[#18202b] outline-none focus:border-[#8a9ba6]"
                placeholder="https://exemplo.com/fundo.jpg"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                aria-label="URL da imagem de fundo"
              />
              <button
                className="rounded-[11px] border-0 bg-[#18202b] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#2d3a49]"
                type="button"
                onClick={applyImageUrl}
              >
                Aplicar
              </button>
            </div>
            {error && (
              <p className="mt-3 mb-0 rounded-[9px] bg-[#fff0e9] px-3 py-2.5 text-[11px] text-[#8b4d39]">
                {error}
              </p>
            )}
            {preferences.backgroundImage && (
              <button
                className="mt-4 text-[11px] font-bold text-[#9a5a43] underline"
                type="button"
                onClick={() => {
                  setBackgroundImage(null);
                  setImageUrl("");
                }}
              >
                Remover imagem
              </button>
            )}
          </article>
        </section>

        <section className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px] max-[520px]:flex-col max-[520px]:items-start">
          <div>
            <p className="m-0 text-[12px] font-bold text-[#34404a]">
              Pré-visualização ativa
            </p>
            <p className="mt-1 mb-0 text-[11px] text-[#87919a]">
              O próximo acesso neste navegador mantém esta aparência.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] border border-[#e2e7e8] bg-transparent px-3 py-2.5 text-[11px] font-bold text-[#697680] transition-colors hover:border-[#aab5bb]"
            type="button"
            onClick={restoreDefaults}
          >
            Restaurar padrão
          </button>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
