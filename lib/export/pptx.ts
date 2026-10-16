import { readFile } from "node:fs/promises";
import path from "node:path";
import Automizer, {
  ModifyImageHelper,
  modify,
  type ShapeModificationCallback,
} from "pptx-automizer";
import { SLIDE_TEMPLATES } from "@/templates/pptx/manifest";
import { parseRasterDataUrl } from "./images";
import type { ExportRequest } from "./types";

const templatePath = path.join(process.cwd(), "templates", "pptx", "base.pptx");

export async function generatePptx(request: ExportRequest) {
  const templateBuffer = await readFile(templatePath);
  const presentation = new Automizer({
    removeExistingSlides: true,
    cleanup: true,
    cleanupPlaceholders: false,
    verbosity: 0,
  })
    .loadRoot(Buffer.from(templateBuffer))
    .load(Buffer.from(templateBuffer), "base");

  const mediaBySlide = new Map<number, Map<string, string>>();
  request.slides.forEach((slide, slideIndex) => {
    for (const [field, source] of Object.entries(slide.images ?? {})) {
      const image = parseRasterDataUrl(source);
      if (!image) throw new Error("Imagem do relatório inválida.");
      const filename = `piersec-export-${slideIndex}-${field}.${image.extension}`;
      presentation.loadMediaBuffer(filename, image.buffer);
      const fields = mediaBySlide.get(slideIndex) ?? new Map<string, string>();
      fields.set(field, filename);
      mediaBySlide.set(slideIndex, fields);
    }
  });

  request.slides.forEach((slide, slideIndex) => {
    const template = SLIDE_TEMPLATES[slide.template];
    presentation.addSlide("base", template.slideNumber, (slideBuilder) => {
      for (const [field, value] of Object.entries(slide.fields)) {
        slideBuilder.modifyElement(field, [modify.setText(value)]);
      }

      for (const [field, filename] of mediaBySlide.get(slideIndex) ?? []) {
        const setImageRelation = ModifyImageHelper.setRelationTarget(filename);
        const replaceImage: ShapeModificationCallback = (element, relation) => {
          if (relation) setImageRelation(element, relation);
        };
        slideBuilder.modifyElement(field, [replaceImage]);
      }

      for (const [field, rows] of Object.entries(slide.tables ?? {})) {
        const [header, ...body] = rows;
        slideBuilder.modifyElement(field, [
          modify.setTable({
            header: { label: "header", values: header },
            body: body.map((values, index) => ({
              label: `row-${index + 1}`,
              values,
            })),
          }),
        ]);
      }
    });
  });

  const zip = await presentation.getJSZip();
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
