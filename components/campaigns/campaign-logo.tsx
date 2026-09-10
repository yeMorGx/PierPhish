"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { readCampaignLogos, writeCampaignLogos } from "@/lib/campaign-logos";

const maxFileSize = 2.5 * 1024 * 1024;
const logoSize = 160;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, logoSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", 0.86);
      const result = webp.startsWith("data:image/")
        ? webp
        : canvas.toDataURL("image/png");
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem."));
    };
    image.src = objectUrl;
  });
}

export function useCampaignLogos() {
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    setLogos(readCampaignLogos());
  }, []);

  function setLogo(campaignId: number, logo: string | null) {
    setLogos((current) => {
      const next = { ...current };
      if (logo) next[String(campaignId)] = logo;
      else delete next[String(campaignId)];
      writeCampaignLogos(next);
      return next;
    });
  }

  return { logos, setLogo };
}

export function CampaignLogo({
  fallback,
  src,
  variant = "compact",
}: {
  fallback: string;
  src?: string | null;
  variant?: "compact" | "hero";
}) {
  return src ? (
    <img
      className={`campaign-logo campaign-logo-${variant}`}
      src={src}
      alt=""
    />
  ) : (
    <span
      className={`campaign-logo campaign-logo-${variant}`}
      aria-hidden="true"
    >
      {fallback}
    </span>
  );
}

export function CampaignLogoPicker({
  campaignId,
  fallback,
}: {
  campaignId: number;
  fallback: string;
}) {
  const { logos, setLogo } = useCampaignLogos();
  const [error, setError] = useState<string | null>(null);
  const logo = logos[String(campaignId)] ?? null;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > maxFileSize) {
      setError("Escolha uma imagem de até 2,5 MB.");
      return;
    }

    try {
      setError(null);
      setLogo(campaignId, await resizeImage(file));
    } catch {
      setError("Não foi possível preparar esta imagem.");
    }
  }

  return (
    <div className="campaign-logo-picker">
      <label className="campaign-logo-picker-label">
        <CampaignLogo fallback={fallback} src={logo} variant="hero" />
        <span className="campaign-logo-picker-copy">
          <strong>{logo ? "Trocar logo" : "Adicionar logo"}</strong>
          <small>Imagem do dispositivo</small>
        </span>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => void handleFile(event)}
          aria-label={logo ? "Trocar logo da campanha" : "Adicionar logo à campanha"}
        />
      </label>
      {logo && (
        <button
          className="campaign-logo-remove"
          type="button"
          onClick={() => {
            setError(null);
            setLogo(campaignId, null);
          }}
        >
          Remover
        </button>
      )}
      {error && <span className="campaign-logo-error">{error}</span>}
    </div>
  );
}
