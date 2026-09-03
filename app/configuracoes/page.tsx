"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  type ThemePreferences,
  useTheme,
} from "@/components/theme/theme-provider";
import { Icon } from "@/components/ui/icon";

const colorPresets = [
  ["Cinza atual", "#f4f4f4"],
  ["Azul névoa", "#edf3f5"],
  ["Areia clara", "#f3f0ea"],
  ["Verde suave", "#eef3ed"],
  ["Lavanda", "#f0eff5"],
] as const;

const cardStyles: Array<{
  id: ThemePreferences["cardStyle"];
  label: string;
  description: string;
}> = [
  {
    id: "solid",
    label: "Sólido",
    description: "Máxima previsibilidade e contraste.",
  },
  {
    id: "translucent",
    label: "Translúcido",
    description: "Leve transparência com desfoque suave.",
  },
  {
    id: "liquid",
    label: "Liquid Glass",
    description: "Brilho fluido e profundidade mais evidente.",
  },
  {
    id: "apple",
    label: "Apple Liquid Glass",
    description: "Vidro polido, luminoso e discreto.",
  },
];

function SettingsContent() {
  const {
    preferences,
    reset,
    setBackgroundImage,
    setCanvas,
    setCardStyle,
    setMode,
    setShowContrastNotice,
  } = useTheme();
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
        <section className="surface-card rounded-[var(--radius-card)] p-8 max-[720px]:rounded-[23px] max-[720px]:p-6">
          <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
            APARÊNCIA DO LENS
          </p>
          <h2 className="m-0 max-w-[700px] text-[clamp(28px,4vw,48px)] leading-[0.95] font-[680] tracking-[-0.07em]">
            Faça o espaço trabalhar a favor da leitura.
          </h2>
          <p className="mt-4 mb-0 max-w-[650px] text-[13px] leading-relaxed text-[#7b838d]">
            A personalização fica salva neste navegador. Ela muda a camada
            visual do painel, mas nunca altera os dados das campanhas.
          </p>
        </section>

        <section className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                TEMA
              </p>
              <h3 className="m-0 text-[18px] font-bold tracking-[-0.04em]">
                Escolha o clima do painel
              </h3>
              <p className="mt-2 mb-0 text-[11px] text-[#87919a]">
                O modo escuro reduz o brilho e preserva a hierarquia dos sinais.
              </p>
            </div>
            <Icon name="palette" size={20} />
          </div>
          <div className="mt-6 grid max-w-[560px] grid-cols-2 gap-2 max-[520px]:grid-cols-1">
            {[
              ["light", "Claro", "Fundo claro e leitura editorial."],
              ["dark", "Escuro", "Contraste profundo para baixa luz."],
            ].map(([mode, label, description]) => (
              <button
                className={`appearance-option ${preferences.mode === mode ? "is-selected" : ""}`}
                type="button"
                aria-pressed={preferences.mode === mode}
                key={mode}
                onClick={() => setMode(mode as ThemePreferences["mode"])}
              >
                <span
                  className={`appearance-swatch appearance-swatch-${mode}`}
                />
                <span className="min-w-0 text-left">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                {preferences.mode === mode && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              ESTILO DOS CARDS
            </p>
            <h3 className="m-0 text-[18px] font-bold tracking-[-0.04em]">
              Escolha quanto o conteúdo flutua
            </h3>
            <p className="mt-2 mb-0 text-[11px] text-[#87919a]">
              Os presets afetam cards, cabeçalho e navegação do painel.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2 max-[980px]:grid-cols-2 max-[520px]:grid-cols-1">
            {cardStyles.map((style) => (
              <button
                className={`card-style-option ${preferences.cardStyle === style.id ? "is-selected" : ""}`}
                type="button"
                aria-pressed={preferences.cardStyle === style.id}
                key={style.id}
                onClick={() => setCardStyle(style.id)}
              >
                <span
                  className={`card-style-preview card-style-preview-${style.id}`}
                >
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{style.label}</strong>
                <small>{style.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)] gap-[var(--cards-gap)] max-[820px]:grid-cols-1">
          <article className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
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

          <article className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
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

        <section className="surface-card rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px]">
          {preferences.showContrastNotice ? (
            <div className="contrast-notice" role="note">
              <span className="contrast-notice-icon">!</span>
              <div>
                <strong>Ajuda de contraste</strong>
                <p>
                  Fundos com muita textura e cards muito transparentes podem
                  esconder números pequenos. Para uma leitura mais segura,
                  prefira o estilo Sólido ou Translúcido e uma cor de fundo
                  uniforme.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContrastNotice(false)}
                aria-label="Ocultar ajuda de contraste"
              >
                Ocultar
              </button>
            </div>
          ) : (
            <button
              className="text-[11px] font-bold text-[var(--accent)] underline"
              type="button"
              onClick={() => setShowContrastNotice(true)}
            >
              Mostrar ajuda de contraste
            </button>
          )}
        </section>

        <section className="surface-card flex items-center justify-between gap-4 rounded-[var(--radius-card)] p-6 max-[720px]:rounded-[23px] max-[520px]:flex-col max-[520px]:items-start">
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
