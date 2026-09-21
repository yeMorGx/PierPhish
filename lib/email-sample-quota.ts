export type EmailSampleStorageUsage = {
  maxBytes: number;
  remainingBytes: number;
  usedBytes: number;
  usedPercentage: number;
};

export function summarizeEmailSampleStorage(
  sizes: number[],
  maxBytes: number,
): EmailSampleStorageUsage {
  const usedBytes = sizes.reduce(
    (total, size) => total + Math.max(0, Number(size) || 0),
    0,
  );
  const safeMaxBytes = Math.max(0, Number(maxBytes) || 0);
  return {
    usedBytes,
    maxBytes: safeMaxBytes,
    remainingBytes: Math.max(0, safeMaxBytes - usedBytes),
    usedPercentage: safeMaxBytes
      ? Math.min(100, Math.round((usedBytes / safeMaxBytes) * 100))
      : 0,
  };
}

export function canFitEmailSample(
  usage: EmailSampleStorageUsage,
  incomingBytes: number,
  replacedBytes = 0,
) {
  return (
    usage.usedBytes - Math.max(0, replacedBytes) + Math.max(0, incomingBytes) <=
    usage.maxBytes
  );
}
