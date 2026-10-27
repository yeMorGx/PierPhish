export function campaignIsTest(campaign: {
  name: string;
  is_test?: boolean | null;
}) {
  return campaign.is_test === true || /teste/i.test(campaign.name);
}

export function clickRateLevel(rate: number) {
  if (rate <= 3) return { label: "Excelente / maduro", tone: "excellent" };
  if (rate <= 5) return { label: "Bom", tone: "good" };
  if (rate <= 10) return { label: "Aceitável", tone: "acceptable" };
  if (rate <= 15) return { label: "Alerta", tone: "warning" };
  return { label: "Crítico", tone: "critical" };
}

export function rawClickRate(
  clicked: number,
  delivered: number,
  people: number,
) {
  const denominator = delivered || people;
  return denominator > 0 ? (clicked / denominator) * 100 : 0;
}
