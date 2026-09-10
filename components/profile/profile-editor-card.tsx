"use client";

import { ChangeEvent, useState } from "react";
import { useProfile } from "@/components/profile/profile-provider";
import { Icon } from "@/components/ui/icon";

const maxAvatarSize = 1.5 * 1024 * 1024;
const supportedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

export function ProfileEditorCard() {
  const { preferences, setAvatar, setDisplayName } = useProfile();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="surface-card profile-panel-card profile-editor-card">
      <div className="profile-panel-heading">
        <div>
          <p className="profile-eyebrow">PERSONALIZAÇÃO</p>
          <h2>Seu perfil no PierPhish</h2>
        </div>
        <Icon name="settings" size={19} />
      </div>
      <p className="profile-panel-description">
        Escolha como seu nome e sua foto aparecem no painel. As alterações são
        salvas automaticamente neste navegador.
      </p>
      <div className="profile-editor-grid">
        <label className="profile-avatar-upload">
          <span className="profile-editor-avatar" aria-hidden="true">
            {preferences.avatar ? (
              <img
                className="size-full object-cover"
                src={preferences.avatar}
                alt=""
              />
            ) : (
              <Icon name="image" size={22} />
            )}
          </span>
          <span className="profile-editor-copy">
            <strong>
              {preferences.avatar ? "Trocar foto" : "Adicionar foto"}
            </strong>
            <small>PNG, JPG ou WEBP · até 1,5 MB</small>
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatar}
          />
        </label>
        <label className="profile-name-field">
          <span>Nome de perfil</span>
          <input
            type="text"
            value={preferences.displayName}
            maxLength={48}
            placeholder="Ex.: Gabriel Morgado"
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
      </div>
      <div className="profile-editor-footer">
        <span>O e-mail de acesso continua vinculado à sua conta.</span>
        {preferences.avatar && (
          <button type="button" onClick={() => setAvatar(null)}>
            Remover foto
          </button>
        )}
      </div>
      {error && <p className="profile-inline-error">{error}</p>}
    </section>
  );
}
