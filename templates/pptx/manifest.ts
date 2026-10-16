import type { SlideTemplate } from "@/lib/export/types";

export const SLIDE_TEMPLATES: Record<
  SlideTemplate,
  {
    slideNumber: number;
    fields: readonly string[];
    images: readonly string[];
    tables: readonly string[];
  }
> = {
  capa: {
    slideNumber: 1,
    fields: ["titulo", "subtitulo"],
    images: ["logo"],
    tables: [],
  },
  metricas: {
    slideNumber: 2,
    fields: [
      "titulo",
      "periodo",
      "campanhas",
      "participantes",
      "enviados",
      "entregues",
      "aberturas",
      "cliques",
      "reportes",
    ],
    images: [],
    tables: [],
  },
  campanhas: {
    slideNumber: 3,
    fields: ["titulo", "periodo"],
    images: [],
    tables: ["campanhas"],
  },
};
