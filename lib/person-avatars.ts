const storageKey = "pierphish-person-avatars";
const maxAvatarLength = 4_500_000;

export type PersonAvatarMap = Record<string, string>;

function isImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxAvatarLength &&
    /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)
  );
}

export function readPersonAvatars(): PersonAvatarMap {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return {};
    }

    const avatars: PersonAvatarMap = {};
    for (const [personId, value] of Object.entries(stored)) {
      if (isImageDataUrl(value)) avatars[personId] = value;
    }
    return avatars;
  } catch {
    return {};
  }
}

export function writePersonAvatars(avatars: PersonAvatarMap) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(avatars));
  } catch {
    // A foto continua disponível nesta sessão mesmo se o storage estiver cheio.
  }
}
