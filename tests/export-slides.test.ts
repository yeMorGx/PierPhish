import { describe, expect, it } from "vitest";
import { buildSlidesFromSiteData } from "@/lib/export/build-slides";

describe("buildSlidesFromSiteData", () => {
  it("constrói slides com métricas agregadas e as cinco campanhas mais clicadas", () => {
    const request = buildSlidesFromSiteData({
      companyName: "Todas as empresas",
      periodLabel: "Todas as datas",
      campaigns: Array.from({ length: 7 }, (_, index) => ({
        name: `Campanha ${index + 1}`,
        people: 100 + index,
        sentPeople: 100 + index,
        deliveredPeople: 90 + index,
        openedPeople: 40 + index,
        clickedPeople: index,
        reportedPeople: 1,
      })),
      totals: {
        campaigns: 7,
        people: 721,
        sent: 721,
        delivered: 651,
        opened: 301,
        clicked: 21,
        reported: 7,
      },
    });

    expect(request.slides).toHaveLength(4);
    expect(request.slides[0]).toMatchObject({
      template: "capa",
      fields: {
        titulo: "Relatório de campanhas",
        subtitulo: "Todas as empresas · Todas as datas",
      },
    });
    expect(request.slides[1].fields).toMatchObject({
      campanhas: "7",
      participantes: "721",
      cliques: "21",
    });
    expect(request.slides[2].tables?.campanhas).toEqual([
      ["Campanha", "Participantes", "Aberturas", "Cliques"],
      ["Campanha 7", "106", "46", "6"],
      ["Campanha 6", "105", "45", "5"],
      ["Campanha 5", "104", "44", "4"],
      ["Campanha 4", "103", "43", "3"],
      ["Campanha 3", "102", "42", "2"],
    ]);
    expect(request.slides[3].tables?.campanhas).toEqual([
      ["Campanha", "Participantes", "Aberturas", "Cliques"],
      ["Campanha 2", "101", "41", "1"],
      ["Campanha 1", "100", "40", "0"],
    ]);
    expect(JSON.stringify(request)).not.toContain("@empresa");
  });

  it("mostra uma linha vazia quando o filtro não encontra campanhas", () => {
    const request = buildSlidesFromSiteData({
      companyName: "Unimar",
      periodLabel: "outubro de 2026",
      campaigns: [],
      totals: {
        campaigns: 0,
        people: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        reported: 0,
      },
    });

    expect(request.slides[2].tables?.campanhas).toEqual([
      ["Campanha", "Participantes", "Aberturas", "Cliques"],
      ["Nenhuma campanha no período", "0", "0", "0"],
    ]);
  });
});
