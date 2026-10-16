import { SLIDE_TEMPLATES } from "@/templates/pptx/manifest";
import {
  MAX_EXPORT_CAMPAIGNS,
  type BuildSlidesInput,
  type ExportRequest,
} from "./types";

const number = new Intl.NumberFormat("pt-BR");

function format(value: number) {
  return number.format(Number.isFinite(value) ? value : 0);
}

export function buildSlidesFromSiteData({
  companyName,
  periodLabel,
  logoDataUrl,
  campaigns,
  totals,
}: BuildSlidesInput): ExportRequest {
  const rankedCampaigns = [...campaigns]
    .sort(
      (first, second) =>
        second.clickedPeople - first.clickedPeople ||
        second.openedPeople - first.openedPeople ||
        first.name.localeCompare(second.name, "pt-BR"),
    )
    .slice(0, MAX_EXPORT_CAMPAIGNS);
  const campaignPages = Array.from(
    { length: Math.max(1, Math.ceil(rankedCampaigns.length / 5)) },
    (_, pageIndex) => rankedCampaigns.slice(pageIndex * 5, pageIndex * 5 + 5),
  );

  return {
    title: "Relatório de campanhas",
    slides: [
      {
        template: "capa",
        fields: {
          titulo: "Relatório de campanhas",
          subtitulo: `${companyName} · ${periodLabel}`,
        },
        ...(logoDataUrl ? { images: { logo: logoDataUrl } } : {}),
      },
      {
        template: "metricas",
        fields: {
          titulo: "Resumo das campanhas",
          periodo: periodLabel,
          campanhas: format(totals.campaigns),
          participantes: format(totals.people),
          enviados: format(totals.sent),
          entregues: format(totals.delivered),
          aberturas: format(totals.opened),
          cliques: format(totals.clicked),
          reportes: format(totals.reported),
        },
      },
      ...campaignPages.map((page, pageIndex) => ({
        template: "campanhas" as const,
        fields: {
          titulo:
            campaignPages.length > 1
              ? `Campanhas com mais cliques · ${pageIndex + 1}/${campaignPages.length}`
              : "Campanhas com mais cliques",
          periodo: periodLabel,
        },
        tables: {
          campanhas: [
            ["Campanha", "Participantes", "Aberturas", "Cliques"],
            ...(page.length > 0
              ? page.map((campaign) => [
                  campaign.name.slice(0, 120),
                  format(campaign.people),
                  format(campaign.openedPeople),
                  format(campaign.clickedPeople),
                ])
              : [["Nenhuma campanha no período", "0", "0", "0"]]),
          ],
        },
      })),
    ],
  };
}

export function getSlideFieldNames(template: keyof typeof SLIDE_TEMPLATES) {
  return SLIDE_TEMPLATES[template];
}
