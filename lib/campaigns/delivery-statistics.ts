export type DeliveryResultSummary = {
  total: number;
  failed: number;
};

export function isDeliveryFailure(value: string | null | undefined) {
  const status = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    "not delivered",
    "nao entregue",
    "fail",
    "error",
    "bounce",
    "reject",
    "falha",
    "falhou",
    "rejeitad",
  ].some((signal) => status.includes(signal));
}

export function resolveCampaignFailureCount(
  stats: { total?: number; error?: number },
  results?: DeliveryResultSummary,
): number | null {
  if (typeof stats.total === "number" && results?.total === stats.total) {
    return results.failed;
  }
  return typeof stats.error === "number" &&
    Number.isFinite(stats.error) &&
    stats.error >= 0
    ? stats.error
    : null;
}
