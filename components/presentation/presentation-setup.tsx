import { Icon } from "@/components/ui/icon";
import type {
  PresentationPreferences,
  PresentationSlideId,
} from "@/components/presentation/presentation-types";

type PresentationSetupProps = {
  campaignCount: number;
  onAutoSyncChange: (enabled: boolean) => void;
  onScrollEnabledChange: (enabled: boolean) => void;
  onScrollSpeedChange: (speed: PresentationPreferences["scrollSpeed"]) => void;
  onSelectSlide: (slide: PresentationSlideId) => void;
  onSlideDurationChange: (
    duration: PresentationPreferences["slideDuration"],
  ) => void;
  onStart: () => void;
  onSyncIntervalChange: (
    interval: PresentationPreferences["syncInterval"],
  ) => void;
  preferences: PresentationPreferences;
  syncing: boolean;
};

const slideOptions: Array<{
  description: string;
  icon: "chart" | "grid" | "users";
  id: PresentationSlideId;
  label: string;
  number: string;
}> = [
  {
    id: "overview",
    number: "01",
    icon: "chart",
    label: "Panorama geral",
    description: "Indicadores consolidados e a jornada da operação.",
  },
  {
    id: "campaigns",
    number: "02",
    icon: "grid",
    label: "Campanhas",
    description: "Ranking, alcance e desempenho de cada campanha.",
  },
  {
    id: "risk",
    number: "03",
    icon: "users",
    label: "Pessoas por risco",
    description: "Uma leitura clara dos sinais que pedem atenção.",
  },
];

export function PresentationSetup({
  campaignCount,
  onAutoSyncChange,
  onScrollEnabledChange,
  onScrollSpeedChange,
  onSelectSlide,
  onSlideDurationChange,
  onStart,
  onSyncIntervalChange,
  preferences,
  syncing,
}: PresentationSetupProps) {
  const selectedCount = preferences.selectedSlides.length;

  return (
    <div className="presentation-setup-grid">
      <section className="surface-card presentation-setup-intro">
        <div className="presentation-setup-intro-copy">
          <p className="presentation-eyebrow">MODO APRESENTAÇÃO</p>
          <h2>
            Um panorama que
            <br />
            fala por você.
          </h2>
          <p>
            Selecione as páginas que farão parte da apresentação. O PierPhish
            cuida da transição, da rolagem e da atualização dos dados enquanto
            você apresenta.
          </p>
        </div>
        <div className="presentation-setup-intro-meta">
          <div>
            <strong>{campaignCount}</strong>
            <span>campanhas disponíveis</span>
          </div>
          <div>
            <strong>{selectedCount}/3</strong>
            <span>páginas selecionadas</span>
          </div>
        </div>
      </section>

      <section className="surface-card presentation-setup-panel">
        <div className="presentation-section-heading">
          <div>
            <p className="presentation-eyebrow">01 · ROTEIRO</p>
            <h3>Escolha os slides</h3>
            <p>
              A apresentação segue este fluxo e avança automaticamente entre as
              páginas escolhidas.
            </p>
          </div>
          <span className="presentation-selection-count">
            {selectedCount} de {slideOptions.length}
          </span>
        </div>

        <div className="presentation-slide-options">
          {slideOptions.map((slide) => {
            const isSelected = preferences.selectedSlides.includes(slide.id);
            return (
              <button
                aria-pressed={isSelected}
                className={`presentation-slide-option ${isSelected ? "is-selected" : ""}`}
                key={slide.id}
                onClick={() => onSelectSlide(slide.id)}
                type="button"
              >
                <span className="presentation-slide-option-topline">
                  <span className="presentation-slide-number">
                    {slide.number}
                  </span>
                  <span className="presentation-slide-option-icon">
                    <Icon name={slide.icon} size={18} />
                  </span>
                  <span className="presentation-slide-check">
                    {isSelected ? <Icon name="check" size={14} /> : null}
                  </span>
                </span>
                <strong>{slide.label}</strong>
                <small>{slide.description}</small>
              </button>
            );
          })}
        </div>
        <p className="presentation-field-help">
          Selecione pelo menos uma página para iniciar a apresentação.
        </p>
      </section>

      <section className="surface-card presentation-setup-panel">
        <div className="presentation-section-heading">
          <div>
            <p className="presentation-eyebrow">02 · RITMO</p>
            <h3>Defina o ritmo da leitura</h3>
            <p>
              As preferências ficam salvas neste navegador para a próxima
              sessão.
            </p>
          </div>
        </div>

        <div className="presentation-setting-grid">
          <div className="presentation-setting-group">
            <div className="presentation-setting-label">
              <span className="presentation-setting-icon">
                <Icon name="arrow" size={17} />
              </span>
              <span>
                <strong>Rolagem automática</strong>
                <small>Desce pelo conteúdo de cada slide.</small>
              </span>
            </div>
            <label className="presentation-switch-row">
              <span>Ativar scroll suave</span>
              <input
                checked={preferences.scrollEnabled}
                onChange={(event) =>
                  onScrollEnabledChange(event.target.checked)
                }
                type="checkbox"
              />
              <i aria-hidden="true" />
            </label>
            <label className="presentation-select-row">
              <span>Velocidade do scroll</span>
              <select
                aria-label="Velocidade do scroll"
                value={preferences.scrollSpeed}
                onChange={(event) =>
                  onScrollSpeedChange(
                    event.target
                      .value as PresentationPreferences["scrollSpeed"],
                  )
                }
              >
                <option value="slow">Lenta</option>
                <option value="medium">Média</option>
                <option value="fast">Rápida</option>
              </select>
            </label>
          </div>

          <div className="presentation-setting-group">
            <div className="presentation-setting-label">
              <span className="presentation-setting-icon">
                <Icon name="refresh" size={17} />
              </span>
              <span>
                <strong>Troca de slides</strong>
                <small>Avança quando o tempo definido termina.</small>
              </span>
            </div>
            <label className="presentation-select-row presentation-select-row-wide">
              <span>Velocidade dos slides</span>
              <select
                aria-label="Velocidade dos slides"
                value={preferences.slideDuration}
                onChange={(event) =>
                  onSlideDurationChange(
                    Number(
                      event.target.value,
                    ) as PresentationPreferences["slideDuration"],
                  )
                }
              >
                <option value="8">Rápida · 8 s</option>
                <option value="12">Média · 12 s</option>
                <option value="20">Tranquila · 20 s</option>
              </select>
            </label>
            <div className="presentation-rhythm-note">
              <span aria-hidden="true">i</span>
              <p>
                Use uma velocidade tranquila quando houver tabelas ou muitos
                dados.
              </p>
            </div>
          </div>

          <div className="presentation-setting-group presentation-setting-group-sync">
            <div className="presentation-setting-label">
              <span className="presentation-setting-icon">
                <Icon name="refresh" size={17} />
              </span>
              <span>
                <strong>Sincronização automática</strong>
                <small>
                  Atualiza os dados enquanto a apresentação está ativa.
                </small>
              </span>
            </div>
            <label className="presentation-switch-row">
              <span>Atualizar informações</span>
              <input
                checked={preferences.autoSync}
                onChange={(event) => onAutoSyncChange(event.target.checked)}
                type="checkbox"
              />
              <i aria-hidden="true" />
            </label>
            <label className="presentation-select-row">
              <span>Intervalo</span>
              <select
                aria-label="Intervalo de sincronização"
                disabled={!preferences.autoSync}
                value={preferences.syncInterval}
                onChange={(event) =>
                  onSyncIntervalChange(
                    Number(
                      event.target.value,
                    ) as PresentationPreferences["syncInterval"],
                  )
                }
              >
                <option value="30">A cada 30 segundos</option>
                <option value="60">A cada 1 minuto</option>
                <option value="300">A cada 5 minutos</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="presentation-setup-footer">
        <div>
          <p className="presentation-eyebrow">PRONTO PARA APRESENTAR?</p>
          <span>
            {selectedCount === 1
              ? "1 página será exibida."
              : `${selectedCount} páginas serão exibidas em sequência.`}
          </span>
        </div>
        <button
          className="presentation-start-button"
          disabled={!selectedCount || syncing}
          onClick={onStart}
          type="button"
        >
          <Icon name="arrow" size={18} />
          Iniciar apresentação
        </button>
      </div>
    </div>
  );
}
