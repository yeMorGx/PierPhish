"use client";

import { ChangeEvent, useState } from "react";
import { defaultProfileAvatars } from "@/lib/default-avatars";
import { useProfile } from "@/components/profile/profile-provider";
import { Icon } from "@/components/ui/icon";

const maxAvatarSize = 1.5 * 1024 * 1024;
const supportedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

export function ProfileEditorCard() {
  const { preferences, setAvatar, setDisplayName } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const usingDefaultAvatar = preferences.avatar?.startsWith("/avatars/");

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
              {preferences.avatar
                ? usingDefaultAvatar
                  ? "Trocar avatar"
                  : "Trocar foto"
                : "Adicionar foto"}
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
      <div className="mt-7 border-t border-[#edf0f1] pt-5">
        <div className="flex items-end justify-between gap-4 max-[560px]:flex-col max-[560px]:items-start">
          <div>
            <p className="m-0 text-[10px] font-extrabold tracking-[0.14em] text-[#9299a2] uppercase">
              AVATARES DO PIERPHISH
            </p>
            <p className="mt-1.5 mb-0 text-[11px] text-[#87919a]">
              Escolha um enquanto não usa uma foto pessoal.
            </p>
          </div>
          {preferences.avatar?.startsWith("/avatars/") && (
            <span className="text-[10px] font-bold text-[var(--aqua)]">
              Avatar escolhido
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-10 gap-2 max-[850px]:grid-cols-5 max-[420px]:grid-cols-4">
          {defaultProfileAvatars.map((avatar) => {
            const selected = preferences.avatar === avatar.src;
            return (
              <button
                className={`group relative aspect-square overflow-hidden rounded-[13px] border-2 bg-[#f1f3f2] transition-transform hover:-translate-y-0.5 ${selected ? "border-[var(--ink)]" : "border-transparent"}`}
                type="button"
                key={avatar.id}
                aria-label={`Usar ${avatar.label}`}
                aria-pressed={selected}
                onClick={() => setAvatar(avatar.src)}
              >
                <img
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  src={avatar.src}
                  alt=""
                />
                {selected && (
                  <span className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-[var(--ink)] text-white">
                    <Icon name="check" size={10} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="profile-editor-footer">
        <span>O e-mail de acesso continua vinculado à sua conta.</span>
        {preferences.avatar && (
          <button type="button" onClick={() => setAvatar(null)}>
            Remover {usingDefaultAvatar ? "avatar" : "foto"}
          </button>
        )}
      </div>
      {error && <p className="profile-inline-error">{error}</p>}
    </section>
  );
}
