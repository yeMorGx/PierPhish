const storageKey = "pierphish-campaign-logos";

type CampaignLogoMap = Record<string, string>;

function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function readCampaignLogos(): CampaignLogoMap {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return {};

    const logos: CampaignLogoMap = {};
    for (const [campaignId, value] of Object.entries(stored)) {
      if (isImageDataUrl(value)) logos[campaignId] = value;
    }
    return logos;
  } catch {
    return {};
  }
}

export function writeCampaignLogos(logos: CampaignLogoMap) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(logos));
  } catch {
    // O painel continua funcionando mesmo quando o armazenamento do navegador
    // está cheio ou indisponível.
  }
}
