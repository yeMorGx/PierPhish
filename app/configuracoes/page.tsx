"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useProfile } from "@/components/profile/profile-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Icon } from "@/components/ui/icon";
import { isSupabaseConfigured } from "@/lib/supabase";

type SettingsTab = "account" | "users" | "style" | "status";
type TextSize = "normal" | "large" | "larger";

const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Conta" },
  { id: "users", label: "Usuários" },
  { id: "style", label: "Estilo" },
  { id: "status", label: "Status" },
];

const colorPresets = [
  ["Cinza atual", "#f4f4f4"],
  ["Azul névoa", "#edf3f5"],
  ["Areia clara", "#f3f0ea"],
  ["Verde suave", "#eef3ed"],
  ["Lavanda", "#f0eff5"],
] as const;

const monkeyAvatars = [
  ["/avatars/monkey-01-coral.png", "Coral"],
  ["/avatars/monkey-02-cobalt.png", "Cobalto"],
  ["/avatars/monkey-03-mint.png", "Menta"],
  ["/avatars/monkey-04-mustard.png", "Mostarda"],
  ["/avatars/monkey-05-violet.png", "Violeta"],
  ["/avatars/monkey-06-orange.png", "Laranja"],
  ["/avatars/monkey-07-sky.png", "Céu"],
  ["/avatars/monkey-08-forest.png", "Floresta"],
  ["/avatars/monkey-09-cream.png", "Creme"],
  ["/avatars/monkey-10-navy.png", "Marinho"],
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

type ProfilePhotoModalProps = {
  open: boolean;
  avatar: string | null;
  initial: string;
  onClose: () => void;
  onRemove: () => void;
  onSelect: (avatar: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

function ProfilePhotoModal({
  open,
  avatar,
  initial,
  onClose,
  onRemove,
  onSelect,
  onUpload,
}: ProfilePhotoModalProps) {
  if (!open) return null;

  return (
    <div
      className="settings-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className="settings-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-photo-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-modal-header">
          <div>
            <p className="settings-modal-eyebrow">PERFIL</p>
            <h2 id="settings-photo-modal-title">Escolha sua foto</h2>
            <p>Use uma imagem sua ou escolha um dos macacos do PierPhish.</p>
          </div>
          <button
            className="settings-modal-close"
            type="button"
            aria-label="Fechar escolha de foto"
            onClick={onClose}
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="settings-modal-current">
          <div className="settings-modal-current-avatar">
            {avatar ? <img src={avatar} alt="Foto atual" /> : initial}
          </div>
          <div>
            <strong>Foto atual</strong>
            <span>PNG, JPG ou WEBP · até 1,5 MB</span>
          </div>
          {avatar && (
            <button
              className="settings-modal-remove"
              type="button"
              onClick={onRemove}
            >
              Remover foto
            </button>
          )}
        </div>

        <label className="settings-avatar-upload">
          <span className="settings-avatar-upload-icon">
            <Icon name="image" size={18} />
          </span>
          <span>
            <strong>Enviar uma foto do dispositivo</strong>
            <small>Selecione um arquivo de imagem</small>
          </span>
          <span className="settings-avatar-upload-action">Escolher</span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onUpload}
          />
        </label>

        <div className="settings-avatar-library">
          <div className="settings-avatar-library-heading">
            <div>
              <span className="settings-panel-label">
                AVATARES DO PIERPHISH
              </span>
              <h3>Escolha um macaco</h3>
            </div>
            <span>10 opções</span>
          </div>
          <div className="settings-avatar-grid">
            {monkeyAvatars.map(([src, label]) => (
              <button
                className={`settings-avatar-option ${avatar === src ? "is-selected" : ""}`}
                type="button"
                key={src}
                aria-pressed={avatar === src}
                onClick={() => onSelect(src)}
              >
                <span className="settings-avatar-option-image">
                  <img src={src} alt={`Macaco ${label}`} />
                  {avatar === src && (
                    <span className="settings-avatar-option-check">
                      <Icon name="check" size={13} />
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const {
    preferences: themePreferences,
    reset: resetTheme,
    setBackgroundImage,
    setCanvas,
    setMode,
  } = useTheme();
  const {
    preferences: profilePreferences,
    setAvatar,
    setDisplayName,
  } = useProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window === "undefined") return "normal";
    const stored = window.localStorage.getItem("pierphish-settings-text-size");
    return stored === "large" || stored === "larger" ? stored : "normal";
  });
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("São Paulo");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy HH:mm");
  const [functionName, setFunctionName] = useState("Segurança da informação");
  const [jobTitle, setJobTitle] = useState("Administrador interno");

  const email = user?.email ?? "admin@teste.com";
  const profileName = profilePreferences.displayName.trim();
  const profileInitial = (profileName || email).slice(0, 1).toUpperCase();
  const connectionLabel = isSupabaseConfigured
    ? "Conexão ativa"
    : "Modo demonstração";

  useEffect(() => {
    const parts = profileName.split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
  }, [profileName]);

  useEffect(() => {
    window.localStorage.setItem("pierphish-settings-text-size", textSize);
  }, [textSize]);

  useEffect(() => {
    if (!photoModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoModalOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [photoModalOpen]);

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
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
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setPhotoModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!supportedAvatarTypes.includes(file.type)) {
      setError("Escolha uma imagem PNG, JPG ou WEBP.");
      return;
    }
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

  function handleTab(tab: SettingsTab) {
    setActiveTab(tab);
    setError(null);
  }

  function restoreDefaults() {
    resetTheme();
    setError(null);
  }

  const accessibilityControl = (
    <div className="settings-accessibility" aria-label="Tamanho do texto">
      <span className="settings-accessibility-label">Acessibilidade</span>
      <div className="settings-text-size-control">
        {(["normal", "large", "larger"] as const).map((size) => (
          <button
            className={textSize === size ? "is-active" : ""}
            type="button"
            key={size}
            aria-label={
              size === "normal"
                ? "Texto normal"
                : size === "large"
                  ? "Texto grande"
                  : "Texto extra grande"
            }
            aria-pressed={textSize === size}
            onClick={() => setTextSize(size)}
          >
            {size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DashboardShell
      activeSection="settings"
      title="Configurações"
      headerAction={accessibilityControl}
    >
      <div className="settings-page" data-text-size={textSize}>
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

        {activeTab === "account" && (
          <div className="settings-bento-grid settings-account-grid">
            <section className="settings-row settings-bento-card settings-bento-profile-info">
              <div className="settings-row-copy">
                <h2>Perfil</h2>
                <p>Defina os detalhes que aparecem no seu ambiente.</p>
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
                </div>
                {error && <p className="settings-inline-error">{error}</p>}
              </div>
            </section>

            <section className="settings-row settings-bento-card settings-bento-photo">
              <div className="settings-row-copy">
                <h2>Foto de perfil</h2>
                <p>Escolha uma imagem para identificar sua conta.</p>
              </div>
              <div className="settings-photo-card-content">
                <button
                  className="settings-photo-frame"
                  type="button"
                  aria-label="Trocar foto de perfil"
                  onClick={() => setPhotoModalOpen(true)}
                >
                  {profilePreferences.avatar ? (
                    <img src={profilePreferences.avatar} alt="" />
                  ) : (
                    profileInitial
                  )}
                </button>
                <button
                  className="settings-photo-button"
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                >
                  {profilePreferences.avatar ? "Editar foto" : "Adicionar foto"}
                </button>
              </div>
            </section>

            <section className="settings-row settings-bento-card settings-bento-preferences">
              <div className="settings-row-copy">
                <h2>Fuso horário e preferências</h2>
                <p>Informe o fuso e o formato de data do painel.</p>
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

            <section className="settings-row settings-bento-card settings-bento-work">
              <div className="settings-row-copy">
                <h2>Seu trabalho</h2>
                <p>Adicione informações sobre sua função na operação.</p>
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

            <section className="settings-row settings-bento-card settings-bento-security">
              <div className="settings-row-copy">
                <h2>Segurança da conta</h2>
                <p>Atualize sua senha sempre que precisar.</p>
              </div>
              <div className="settings-row-main settings-link-actions">
                <Link className="settings-outline-button" href="/alterar-senha">
                  Alterar senha
                  <Icon name="arrow" size={15} />
                </Link>
              </div>
            </section>
          </div>
        )}

        {activeTab === "users" && (
          <section className="settings-summary-panel settings-bento-card">
            <div className="settings-summary-heading">
              <div>
                <span className="settings-panel-label">
                  ACESSOS DO AMBIENTE
                </span>
                <h2>Usuários e permissões</h2>
                <p>
                  Crie contas internas e acompanhe quem pode acessar o
                  PierPhish.
                </p>
              </div>
              <span className="settings-summary-icon">
                <Icon name="users" size={21} />
              </span>
            </div>
            <div className="settings-summary-divider" />
            <div className="settings-summary-item">
              <div>
                <strong>Administração de usuários</strong>
                <span>
                  Convide pessoas, defina acessos e acompanhe a troca de senha
                  inicial.
                </span>
              </div>
              <Link className="settings-primary-button" href="/usuarios">
                Abrir usuários
                <Icon name="arrow" size={15} />
              </Link>
            </div>
          </section>
        )}

        {activeTab === "style" && (
          <div className="settings-bento-grid settings-style-grid">
            <section className="settings-row settings-bento-card settings-style-main-card">
              <div className="settings-row-copy">
                <h2>Estilo do painel</h2>
                <p>Escolha o modo de exibição e a base visual do PierPhish.</p>
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
                        onClick={() => setMode(mode)}
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
                <div className="settings-panel-block">
                  <span className="settings-panel-label">Imagem do fundo</span>
                  <div className="settings-background-controls">
                    <label className="settings-upload-control">
                      <Icon name="image" size={15} />
                      Escolher imagem
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleBackgroundUpload}
                      />
                    </label>
                    {themePreferences.backgroundImage && (
                      <button
                        className="settings-remove-link"
                        type="button"
                        onClick={() => setBackgroundImage(null)}
                      >
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>
                {error && <p className="settings-inline-error">{error}</p>}
              </div>
            </section>
            <aside className="settings-bento-card settings-style-preview">
              <span className="settings-panel-label">PRÉVIA DO PAINEL</span>
              <div className="settings-preview-window">
                <div className="settings-preview-window-top">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="settings-preview-window-content">
                  <span className="settings-preview-kicker">PIERPHISH</span>
                  <strong>Visão geral</strong>
                  <div className="settings-preview-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="settings-preview-blocks">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <p>Uma prévia simples para você reconhecer o tema escolhido.</p>
            </aside>
            <div className="settings-footer">
              <p>As preferências visuais ficam salvas neste navegador.</p>
              <button type="button" onClick={restoreDefaults}>
                Restaurar padrão
              </button>
            </div>
          </div>
        )}

        {activeTab === "status" && (
          <section className="settings-summary-panel settings-bento-card settings-status-panel">
            <div className="settings-summary-heading">
              <div>
                <span className="settings-panel-label">SAÚDE DO AMBIENTE</span>
                <h2>Conexão e sincronização</h2>
                <p>
                  Confira rapidamente se os dados estão disponíveis para
                  leitura.
                </p>
              </div>
              <span className="settings-status-state">
                <span />
                {connectionLabel}
              </span>
            </div>
            <div className="settings-status-grid">
              <div>
                <span>Conta</span>
                <strong>{email}</strong>
                <small>
                  {isSupabaseConfigured
                    ? "Conta autenticada"
                    : "Dados locais de demonstração"}
                </small>
              </div>
              <div>
                <span>Dados</span>
                <strong>
                  {isSupabaseConfigured ? "Disponíveis" : "Exemplo local"}
                </strong>
                <small>Campanhas e indicadores consolidados</small>
              </div>
            </div>
            <div className="settings-summary-divider" />
            <div className="settings-summary-item">
              <div>
                <strong>Verificação completa</strong>
                <span>
                  Abra o status para acompanhar a leitura detalhada do ambiente.
                </span>
              </div>
              <Link className="settings-primary-button" href="/status">
                Ver status
                <Icon name="arrow" size={15} />
              </Link>
            </div>
          </section>
        )}

        <ProfilePhotoModal
          open={photoModalOpen}
          avatar={profilePreferences.avatar}
          initial={profileInitial}
          onClose={() => setPhotoModalOpen(false)}
          onRemove={() => {
            setAvatar(null);
            setPhotoModalOpen(false);
          }}
          onSelect={(avatar) => {
            setAvatar(avatar);
            setPhotoModalOpen(false);
          }}
          onUpload={handleAvatarUpload}
        />
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
