"use client";

import JSZip from "jszip";
import {
  MAX_EXPORT_CAMPAIGNS,
  type CampaignExportSummary,
  type CampaignExportTotals,
} from "@/lib/export/types";

export const MAX_CANVA_TEMPLATE_BYTES = 20 * 1024 * 1024;

const MAX_ARCHIVE_ENTRIES = 3000;
const MAX_EXPANDED_ARCHIVE_BYTES = 150 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 75 * 1024 * 1024;
const MAX_SLIDES = 100;
const MAX_SLIDE_XML_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_SLIDE_XML_BYTES = 20 * 1024 * 1024;
const POWERPOINT_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type CanvaTemplateData = {
  companyName: string;
  periodLabel: string;
  campaigns: CampaignExportSummary[];
  totals: CampaignExportTotals;
};

export type CanvaTemplateScan = {
  slides: number;
  placeholders: string[];
  recognized: string[];
  unrecognized: string[];
};

export type CanvaTemplateResult = {
  blob: Blob;
  replaced: number;
  unrecognized: string[];
};

const markerPattern = /\{\{\s*([^{}]{1,80}?)\s*\}\}/g;
const textNodePattern = /(<a:t(?:\s[^>]*)?>)([\s\S]*?)(<\/a:t>)/g;

const numberFormat = new Intl.NumberFormat("pt-BR");
const percentFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

function formatNumber(value: number) {
  return numberFormat.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number, total: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeTotal = Number.isFinite(total) ? total : 0;
  return `${percentFormat.format(safeTotal > 0 ? (safeValue / safeTotal) * 100 : 0)}%`;
}

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function orderedCampaigns(campaigns: CampaignExportSummary[]) {
  return [...campaigns]
    .sort(
      (first, second) =>
        second.clickedPeople - first.clickedPeople ||
        second.openedPeople - first.openedPeople ||
        first.name.localeCompare(second.name, "pt-BR"),
    )
    .slice(0, MAX_EXPORT_CAMPAIGNS);
}

export function buildCanvaTemplateValues(data: CanvaTemplateData) {
  const values: Record<string, string> = {
    empresa: data.companyName,
    periodo: data.periodLabel,
    campanhas: formatNumber(data.totals.campaigns),
    participantes: formatNumber(data.totals.people),
    enviados: formatNumber(data.totals.sent),
    entregues: formatNumber(data.totals.delivered),
    aberturas: formatNumber(data.totals.opened),
    taxa_abertura: formatPercent(data.totals.opened, data.totals.people),
    cliques: formatNumber(data.totals.clicked),
    taxa_cliques: formatPercent(
      data.totals.clicked,
      data.totals.delivered || data.totals.people,
    ),
    reportes: formatNumber(data.totals.reported),
  };

  const campaigns = orderedCampaigns(data.campaigns);
  for (let index = 0; index < MAX_EXPORT_CAMPAIGNS; index += 1) {
    const campaign = campaigns[index];
    const number = index + 1;
    const prefix = `campanha_${number}_`;
    if (!campaign) {
      for (const field of [
        "nome",
        "participantes",
        "enviados",
        "entregues",
        "aberturas",
        "taxa_abertura",
        "cliques",
        "taxa_cliques",
        "reportes",
      ]) {
        values[`${prefix}${field}`] = "";
      }
      continue;
    }

    values[`${prefix}nome`] = campaign.name;
    values[`${prefix}participantes`] = formatNumber(campaign.people);
    values[`${prefix}enviados`] = formatNumber(campaign.sentPeople);
    values[`${prefix}entregues`] = formatNumber(campaign.deliveredPeople);
    values[`${prefix}aberturas`] = formatNumber(campaign.openedPeople);
    values[`${prefix}taxa_abertura`] = formatPercent(
      campaign.openedPeople,
      campaign.people,
    );
    values[`${prefix}cliques`] = formatNumber(campaign.clickedPeople);
    values[`${prefix}taxa_cliques`] = formatPercent(
      campaign.clickedPeople,
      campaign.deliveredPeople || campaign.people,
    );
    values[`${prefix}reportes`] = formatNumber(campaign.reportedPeople);
  }

  return values;
}

function assertSafeArchive(zip: JSZip) {
  const entries = Object.keys(zip.files);
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("O PowerPoint contém itens demais para processar.");
  }
  if (
    entries.some(
      (name) =>
        name.startsWith("/") ||
        name.includes("\\") ||
        name.split("/").some((part) => part === ".."),
    )
  ) {
    throw new Error("O arquivo contém caminhos inválidos.");
  }
  let expandedBytes = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const size = (
      entry as JSZip.JSZipObject & {
        _data?: { uncompressedSize?: number };
      }
    )._data?.uncompressedSize;
    if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
      throw new Error("O PowerPoint contém um item ilegível.");
    }
    if (size > MAX_ARCHIVE_ENTRY_BYTES) {
      throw new Error("Um item do PowerPoint excede o tamanho permitido.");
    }
    expandedBytes += size;
    if (expandedBytes > MAX_EXPANDED_ARCHIVE_BYTES) {
      throw new Error("O conteúdo descompactado excede o limite permitido.");
    }
  }
  if (!zip.file("[Content_Types].xml") || !zip.file("ppt/presentation.xml")) {
    throw new Error("Esse arquivo não parece ser uma apresentação PowerPoint.");
  }
}

async function getSlides(zip: JSZip) {
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((first, second) => {
      const firstNumber = Number(first.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const secondNumber = Number(second.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return firstNumber - secondNumber;
    });

  if (slidePaths.length === 0 || slidePaths.length > MAX_SLIDES) {
    throw new Error(`O modelo precisa ter de 1 a ${MAX_SLIDES} slides.`);
  }

  let totalBytes = 0;
  const slides: Array<{ path: string; xml: string }> = [];
  for (const path of slidePaths) {
    const slide = zip.file(path);
    if (!slide) continue;
    const xml = await slide.async("string");
    const byteLength = new TextEncoder().encode(xml).byteLength;
    if (byteLength > MAX_SLIDE_XML_BYTES) {
      throw new Error("Um slide excede o limite de tamanho permitido.");
    }
    totalBytes += byteLength;
    if (totalBytes > MAX_TOTAL_SLIDE_XML_BYTES) {
      throw new Error("O conteúdo dos slides excede o limite permitido.");
    }
    slides.push({ path, xml });
  }
  return slides;
}

function scanSlideText(xml: string) {
  const placeholders = new Set<string>();
  for (const textNode of xml.matchAll(textNodePattern)) {
    for (const match of textNode[2].matchAll(markerPattern)) {
      placeholders.add(match[1].trim().toLowerCase());
    }
  }
  return placeholders;
}

function isSupportedPlaceholder(key: string, values: Record<string, string>) {
  return Object.hasOwn(values, key);
}

async function loadTemplate(file: File) {
  if (!file.name.toLowerCase().endsWith(".pptx")) {
    throw new Error("Escolha um arquivo .pptx exportado do Canva.");
  }
  if (file.size === 0 || file.size > MAX_CANVA_TEMPLATE_BYTES) {
    throw new Error("O arquivo precisa ter até 20 MB.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("Não foi possível abrir esse PowerPoint.");
  }
  assertSafeArchive(zip);
  return { zip, slides: await getSlides(zip) };
}

export async function inspectCanvaTemplate(
  file: File,
  data: CanvaTemplateData,
) {
  const { slides } = await loadTemplate(file);
  const values = buildCanvaTemplateValues(data);
  const placeholders = new Set<string>();
  for (const slide of slides) {
    for (const placeholder of scanSlideText(slide.xml)) {
      placeholders.add(placeholder);
    }
  }

  const names = [...placeholders].sort((first, second) =>
    first.localeCompare(second, "pt-BR"),
  );
  return {
    slides: slides.length,
    placeholders: names,
    recognized: names.filter((name) => isSupportedPlaceholder(name, values)),
    unrecognized: names.filter((name) => !isSupportedPlaceholder(name, values)),
  } satisfies CanvaTemplateScan;
}

export async function fillCanvaTemplate(
  file: File,
  data: CanvaTemplateData,
): Promise<CanvaTemplateResult> {
  const { zip, slides } = await loadTemplate(file);
  const values = buildCanvaTemplateValues(data);
  const unrecognized = new Set<string>();
  let replaced = 0;

  for (const slide of slides) {
    const updated = slide.xml.replace(
      textNodePattern,
      (node, opening: string, text: string, closing: string) => {
        const content = text.replace(markerPattern, (marker, rawName) => {
          const name = rawName.trim().toLowerCase();
          if (!isSupportedPlaceholder(name, values)) {
            unrecognized.add(name);
            return marker;
          }
          replaced += 1;
          return escapeXml(values[name]);
        });
        return `${opening}${content}${closing}`;
      },
    );
    zip.file(slide.path, updated);
  }

  if (replaced === 0) {
    throw new Error(
      "Nenhum campo PierSec foi encontrado. Adicione marcadores como {{empresa}} no Canva.",
    );
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: POWERPOINT_MIME,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { blob, replaced, unrecognized: [...unrecognized] };
}
