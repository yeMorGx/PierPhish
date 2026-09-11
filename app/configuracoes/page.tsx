"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useProfile } from "@/components/profile/profile-provider";
import {
  type ThemePreferences,
  useTheme,
} from "@/components/theme/theme-provider";
import { Icon } from "@/components/ui/icon";

type SettingsTab =
  | "account"
  | "notifications"
  | "sharing"
  | "schedule"
  | "billing"
  | "questions";

const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Conta" },
  { id: "notifications", label: "Notificações" },
  { id: "sharing", label: "Compartilhamento" },
  { id: "schedule", label: "Atualização automática" },
  { id: "billing", label: "Faturamento" },
  { id: "questions", label: "Dúvidas" },
];

const tabTitles: Record<Exclude<SettingsTab, "account">, string> = {
  notifications: "Notificações",
  sharing: "Compartilhamento",
  schedule: "Atualização automática",
  billing: "Faturamento",
  questions: "Dúvidas",
};

const colorPresets = [
  ["Cinza atual", "#f4f4f4"],
  ["Azul névoa", "#edf3f5"],
  ["Areia clara", "#f3f0ea"],
  ["Verde suave", "#eef3ed"],
  ["Lavanda", "#f0eff5"],
] as const;

const maxAvatarSize = 1.5 * 1024 * 1024;
const supportedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

function updateFullName(
  firstName: string,
  lastName: string,
  update: (value: string) => void,
) {
  update([firstName.trim(), lastName.trim()].filter(Boolean).join(" "));
}

function SettingsContent() {
  const { user } = useAuth();
  const {
    preferences: themePreferences,
    reset,
    setBackgroundImage,
    setCanvas,
    setMode,
    setShowContrastNotice,
  } = useTheme();
  const {
    preferences: profilePreferences,
    setAvatar,
    setDisplayName,
  } = useProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("São Paulo");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy HH:mm");
  const [dailyHours, setDailyHours] = useState(7);
  const [weeklyFocus, setWeeklyFocus] = useState(6);
  const [functionName, setFunctionName] = useState("Segurança da informação");
  const [jobTitle, setJobTitle] = useState("Administrador interno");

  const email = user?.email ?? "admin@teste.com";
  const profileName = profilePreferences.displayName.trim();
  const profileInitial = (profileName || email).slice(0, 1).toUpperCase();
  const usingDefaultAvatar = profilePreferences.avatar?.startsWith("/avatars/");

  useEffect(() => {
    if (themePreferences.backgroundImage?.startsWith("http")) {
      setImageUrl(themePreferences.backgroundImage);
    }
  }, [themePreferences.backgroundImage]);

  useEffect(() => {
    const parts = profileName.split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
  }, [profileName]);

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!supportedAvatarTypes.includes(file.type)) {
      setError("Escolha uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > maxAvatarSize) {
      setError("Escolha uma foto de até 1,5 MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleTab(tab: SettingsTab) {
    setActiveTab(tab);
    setError(null);
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
      <div className="settings-page">
        <div className="settings-heading">
          <h1>Configurações</h1>
          <p>Gerencie sua conta e suas preferências.</p>
        </div>

        <nav className="settings-tabs" aria-label="Seções das configurações">
          {settingsTabs.map((tab) => (
            <button
              className={`settings-tab ${activeTab === tab.id ? "is-active" : ""}`}
              type="button"
              key={tab.id}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => handleTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "account" ? (
          <div className="settings-sections">
            <section className="settings-row settings-profile-row">
              <div className="settings-row-copy">
                <h2>Perfil</h2>
                <p>Defina os detalhes da sua conta.</p>
              </div>
              <div className="settings-row-main">
                <div className="settings-profile-grid">
                  <label className="settings-field">
                    <span>Nome</span>
                    <input
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        updateFullName(
                          event.target.value,
                          lastName,
                          setDisplayName,
                        );
                      }}
                      placeholder="Seu nome"
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Sobrenome</span>
                    <input
                      value={lastName}
                      onChange={(event) => {
                        setLastName(event.target.value);
                        updateFullName(
                          firstName,
                          event.target.value,
                          setDisplayName,
                        );
                      }}
                      placeholder="Seu sobrenome"
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="settings-field settings-email-field">
                    <span>E-mail</span>
                    <input value={email} readOnly aria-readonly="true" />
                  </label>
                  <div className="settings-photo-column">
                    <div className="settings-photo-frame">
                      {profilePreferences.avatar ? (
                        <img src={profilePreferences.avatar} alt="" />
                      ) : (
                        profileInitial
                      )}
                    </div>
                    <div className="settings-photo-actions">
                      <label className="settings-photo-button">
                        {profilePreferences.avatar
                          ? "Editar foto"
                          : "Adicionar foto"}
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatar}
                        />
                      </label>
                      {profilePreferences.avatar && (
                        <button type="button" onClick={() => setAvatar(null)}>
                          <Icon name="close" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {error && <p className="settings-inline-error">{error}</p>}
              </div>
            </section>

            <section className="settings-row">
              <div className="settings-row-copy">
                <h2>Fuso horário e preferências</h2>
                <p>Informe o fuso e o formato de data.</p>
              </div>
              <div className="settings-row-main settings-three-fields">
                <label className="settings-field">
                  <span>Cidade</span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </label>
                <label className="settings-field">
                  <span>Fuso horário</span>
                  <select
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                  >
                    <option value="America/Sao_Paulo">UTC/GMT -3 horas</option>
                    <option value="America/New_York">UTC/GMT -4 horas</option>
                    <option value="Europe/Lisbon">UTC/GMT +0 horas</option>
                  </select>
                </label>
                <label className="settings-field">
                  <span>Data e hora</span>
                  <select
                    value={dateFormat}
                    onChange={(event) => setDateFormat(event.target.value)}
                  >
                    <option value="dd/MM/yyyy HH:mm">dd/mm/aaaa 00:00</option>
                    <option value="MM/dd/yyyy hh:mm a">
                      mm/dd/aaaa 00:00 AM
                    </option>
                    <option value="yyyy-MM-dd HH:mm">aaaa-mm-dd 00:00</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="settings-row">
              <div className="settings-row-copy">
                <h2>Motivação e desempenho</h2>
                <p>Calibre os níveis de atividade da sua equipe.</p>
                <button className="settings-learn-more" type="button">
                  Saiba mais sobre a classificação
                  <span>i</span>
                </button>
              </div>
              <div className="settings-row-main settings-slider-grid">
                <label className="settings-slider-field">
                  <span>
                    <span>Uso diário desejado</span>
                    <strong>{dailyHours} horas</strong>
                  </span>
                  <input
                    className="settings-range"
                    type="range"
                    min="1"
                    max="12"
                    value={dailyHours}
                    onChange={(event) =>
                      setDailyHours(Number(event.target.value))
                    }
                    aria-label="Uso diário desejado"
                  />
                  <small>
                    Encontre a alocação ideal para o seu ritmo de trabalho.
                  </small>
                </label>
                <label className="settings-slider-field">
                  <span>
                    <span>Faixa de trabalho concentrado</span>
                    <strong>{weeklyFocus}–8 horas</strong>
                  </span>
                  <input
                    className="settings-range"
                    type="range"
                    min="2"
                    max="10"
                    value={weeklyFocus}
                    onChange={(event) =>
                      setWeeklyFocus(Number(event.target.value))
                    }
                    aria-label="Faixa de trabalho concentrado"
                  />
                  <small>
                    Defina as horas de maior foco para acompanhar o ritmo.
                  </small>
                </label>
              </div>
            </section>

            <section className="settings-row">
              <div className="settings-row-copy">
                <h2>Seu trabalho</h2>
                <p>Adicione informações sobre sua função.</p>
              </div>
              <div className="settings-row-main settings-two-fields">
                <label className="settings-field">
                  <span>Função</span>
                  <input
                    value={functionName}
                    onChange={(event) => setFunctionName(event.target.value)}
                  />
                </label>
                <label className="settings-field">
                  <span>Cargo</span>
                  <input
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="settings-row settings-panel-row">
              <div className="settings-row-copy">
                <h2>Experiência do painel</h2>
                <p>Escolha como o PierPhish aparece para você.</p>
              </div>
              <div className="settings-row-main settings-panel-main">
                <div className="settings-panel-block">
                  <span className="settings-panel-label">Modo de exibição</span>
                  <div className="settings-segmented">
                    {(["light", "dark"] as const).map((mode) => (
                      <button
                        className={
                          themePreferences.mode === mode ? "is-active" : ""
                        }
                        type="button"
                        key={mode}
                        onClick={() =>
                          setMode(mode as ThemePreferences["mode"])
                        }
                      >
                        {mode === "light" ? "Claro" : "Escuro"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-panel-block">
                  <span className="settings-panel-label">Cor do fundo</span>
                  <div className="settings-color-row">
                    <input
                      type="color"
                      value={themePreferences.canvas}
                      onChange={(event) => setCanvas(event.target.value)}
                      aria-label="Escolher cor do fundo"
                    />
                    <span>{themePreferences.canvas.toUpperCase()}</span>
                    {colorPresets.map(([label, color]) => (
                      <button
                        className={
                          themePreferences.canvas === color ? "is-active" : ""
                        }
                        type="button"
                        key={color}
                        title={label}
                        aria-label={label}
                        onClick={() => setCanvas(color)}
                      >
                        <span style={{ backgroundColor: color }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-panel-block settings-background-block">
                  <span className="settings-panel-label">Imagem do fundo</span>
                  <div className="settings-background-controls">
                    <label className="settings-upload-control">
                      <Icon name="image" size={15} />
                      Escolher imagem
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2.5 * 1024 * 1024) {
                            setError("Escolha uma imagem de até 2,5 MB.");
                            return;
                          }
                          setError(null);
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string")
                              setBackgroundImage(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      className="settings-url-input"
                      placeholder="URL da imagem"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      aria-label="URL da imagem de fundo"
                    />
                    <button
                      className="settings-small-button"
                      type="button"
                      onClick={applyImageUrl}
                    >
                      Aplicar
                    </button>
                    {themePreferences.backgroundImage && (
                      <button
                        className="settings-remove-link"
                        type="button"
                        onClick={() => {
                          setBackgroundImage(null);
                          setImageUrl("");
                        }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                {themePreferences.showContrastNotice && (
                  <div className="settings-contrast-note" role="note">
                    <span>!</span>
                    <p>
                      Fundos uniformes ajudam a manter os dados pequenos
                      legíveis.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowContrastNotice(false)}
                    >
                      Ocultar
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="settings-row settings-link-row">
              <div className="settings-row-copy">
                <h2>Saúde do ambiente</h2>
                <p>Veja a conexão e a última sincronização dos dados.</p>
              </div>
              <div className="settings-row-main settings-link-actions">
                <Link className="settings-outline-button" href="/status">
                  Status da conexão
                  <Icon name="arrow" size={15} />
                </Link>
                <Link className="settings-outline-button" href="/usuarios">
                  Usuários e acessos
                  <Icon name="arrow" size={15} />
                </Link>
              </div>
            </section>

            <div className="settings-footer">
              <p>As preferências visuais ficam salvas neste navegador.</p>
              <button type="button" onClick={restoreDefaults}>
                Restaurar padrão
              </button>
            </div>
          </div>
        ) : (
          <section className="settings-placeholder">
            <span className="settings-placeholder-icon">
              <Icon name="settings" size={18} />
            </span>
            <h2>{tabTitles[activeTab]}</h2>
            <p>
              Esta área está preparada para receber suas preferências em uma
              próxima etapa.
            </p>
            <button type="button" onClick={() => setActiveTab("account")}>
              Voltar para Conta
            </button>
          </section>
        )}
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
