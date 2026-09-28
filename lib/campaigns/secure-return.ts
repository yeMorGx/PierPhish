export type EncryptedReturn = {
  version: 1;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
};

function toBase64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function createSecureReturnKey() {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false,
    ["encrypt", "decrypt"],
  );
  const publicKey = await crypto.subtle.exportKey("spki", keys.publicKey);
  const encoded =
    toBase64(publicKey)
      .match(/.{1,64}/g)
      ?.join("\n") ?? "";
  return {
    privateKey: keys.privateKey,
    publicKey: `-----BEGIN PUBLIC KEY-----\n${encoded}\n-----END PUBLIC KEY-----`,
  };
}

export async function decryptSecureReturn<T>(
  envelope: EncryptedReturn,
  privateKey: CryptoKey,
): Promise<T> {
  if (
    envelope.version !== 1 ||
    typeof envelope.wrappedKey !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  )
    throw new Error("A resposta protegida está inválida.");

  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(envelope.wrappedKey),
  );
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "decrypt",
  ]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(envelope.iv) },
    key,
    fromBase64(envelope.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
