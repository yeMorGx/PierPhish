import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "templates", "pptx");
const logoPath = path.join(root, "public", "piersec-logo.png");

await fs.mkdir(outputDirectory, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "PierSec";
pptx.subject = "Modelo de exportação de relatórios de campanhas";
pptx.title = "Modelo PierSec — Relatório de campanhas";
pptx.company = "PierSec";
pptx.lang = "pt-BR";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "pt-BR",
};

const textStyle = {
  fontFace: "Aptos",
  color: "171717",
  margin: 0,
  valign: "mid",
};

function addText(slide, value, objectName, options) {
  slide.addText(value, { ...textStyle, objectName, ...options });
}

function addDivider(slide, x, y, width) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w: width,
    h: 0,
    line: { color: "E8E8E8", width: 0.8 },
  });
}

const cover = pptx.addSlide();
cover.background = { color: "FFFFFF" };
cover.addImage({
  path: logoPath,
  x: 0.9,
  y: 0.8,
  w: 2.2,
  h: 0.7,
  objectName: "logo",
});
addText(cover, "Relatório de campanhas", "titulo", {
  x: 0.9,
  y: 3.0,
  w: 11.5,
  h: 0.75,
  fontFace: "Aptos Display",
  fontSize: 34,
  bold: true,
  charSpacing: -0.6,
});
addDivider(cover, 0.9, 3.98, 1.1);
addText(cover, "PierSec · Todas as empresas · Todas as datas", "subtitulo", {
  x: 0.9,
  y: 4.25,
  w: 11.5,
  h: 0.42,
  fontSize: 15,
  color: "666666",
});
addText(cover, "VISÃO GERAL", "marcador-capa", {
  x: 0.9,
  y: 6.55,
  w: 3,
  h: 0.25,
  fontSize: 9,
  bold: true,
  charSpacing: 1.1,
  color: "666666",
});

const metrics = pptx.addSlide();
metrics.background = { color: "FFFFFF" };
addText(metrics, "Resumo das campanhas", "titulo", {
  x: 0.65,
  y: 0.62,
  w: 10.9,
  h: 0.5,
  fontFace: "Aptos Display",
  fontSize: 24,
  bold: true,
  charSpacing: -0.3,
});
addText(metrics, "Todas as datas", "periodo", {
  x: 0.65,
  y: 1.2,
  w: 10.9,
  h: 0.28,
  fontSize: 11,
  color: "666666",
});

const metricItems = [
  ["Campanhas", "campanhas"],
  ["Participantes", "participantes"],
  ["Enviados", "enviados"],
  ["Entregues", "entregues"],
  ["Aberturas", "aberturas"],
  ["Cliques", "cliques"],
  ["Reportes", "reportes"],
];
const metricWidth = 3.84;
const metricGap = 0.45;
const metricTop = 2.15;
const metricRowHeight = 1.55;

metricItems.forEach(([label, field], index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  const x = 0.65 + column * (metricWidth + metricGap);
  const y = metricTop + row * metricRowHeight;
  addText(metrics, label.toUpperCase(), `rotulo-${field}`, {
    x,
    y,
    w: metricWidth,
    h: 0.25,
    fontSize: 9,
    bold: true,
    charSpacing: 0.6,
    color: "666666",
  });
  addText(metrics, "0", field, {
    x,
    y: y + 0.38,
    w: metricWidth,
    h: 0.7,
    fontFace: "Aptos Display",
    fontSize: 30,
    bold: true,
  });
  addDivider(metrics, x, y + 1.22, metricWidth);
});

const campaigns = pptx.addSlide();
campaigns.background = { color: "FFFFFF" };
addText(campaigns, "Campanhas com mais cliques", "titulo", {
  x: 0.65,
  y: 0.62,
  w: 10.9,
  h: 0.5,
  fontFace: "Aptos Display",
  fontSize: 24,
  bold: true,
  charSpacing: -0.3,
});
addText(campaigns, "Todas as datas", "periodo", {
  x: 0.65,
  y: 1.2,
  w: 10.9,
  h: 0.28,
  fontSize: 11,
  color: "666666",
});

const tableHeaders = ["Campanha", "Participantes", "Aberturas", "Cliques"];
const tableRows = [
  tableHeaders.map((text) => ({
    text,
    options: {
      bold: true,
      color: "666666",
      fontSize: 9,
      fill: { color: "F6F6F6" },
      border: { color: "E8E8E8", pt: 0.7 },
    },
  })),
  ...Array.from({ length: 5 }, () => ["", "", "", ""]),
];
campaigns.addTable(tableRows, {
  x: 0.65,
  y: 2.0,
  w: 12.03,
  h: 3.8,
  colW: [6.03, 2.0, 2.0, 2.0],
  rowH: 0.58,
  objectName: "campanhas",
  border: { color: "E8E8E8", pt: 0.7 },
  color: "171717",
  fontFace: "Aptos",
  fontSize: 12,
  margin: 0.12,
  valign: "mid",
  autoPage: false,
  autoPageRepeatHeader: true,
  autoPageHeaderRows: 1,
});

await pptx.writeFile({
  fileName: path.join(outputDirectory, "base.pptx"),
  compression: true,
});
