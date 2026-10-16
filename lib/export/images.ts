const MAX_IMAGE_BYTES = 1024 * 1024;

export type RasterImage = {
  extension: "png" | "jpg";
  buffer: Buffer;
};

export function parseRasterDataUrl(value: string): RasterImage | null {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  );
  if (!match) return null;

  const [, mime, encoded] = match;
  if (encoded.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) return null;

  const buffer = Buffer.from(encoded, "base64");
  if (
    buffer.length === 0 ||
    buffer.length > MAX_IMAGE_BYTES ||
    buffer.toString("base64") !== encoded
  ) {
    return null;
  }

  if (mime === "png") {
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buffer.subarray(0, 8).equals(pngSignature)) return null;
    return { extension: "png", buffer };
  }

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    return null;
  }
  return { extension: "jpg", buffer };
}
