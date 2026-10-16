import { describe, expect, it } from "vitest";
import { buildSlidesFromSiteData } from "@/lib/export/build-slides";
import { generatePptx } from "@/lib/export/pptx";

describe("generatePptx", () => {
  it("gera um PPTX com os três modelos e páginas extras de campanhas", async () => {
    const request = buildSlidesFromSiteData({
      companyName: "PierSec",
      periodLabel: "Todas as datas",
      campaigns: Array.from({ length: 7 }, (_, index) => ({
        name: `Campanha ${index + 1}`,
        people: 12,
        sentPeople: 12,
        deliveredPeople: 11,
        openedPeople: 8,
        clickedPeople: index,
        reportedPeople: 1,
      })),
      totals: {
        campaigns: 1,
        people: 12,
        sent: 12,
        delivered: 11,
        opened: 8,
        clicked: 3,
        reported: 1,
      },
    });

    const buffer = await generatePptx(request);
    const packageEntries = buffer.toString("latin1");
    const slideFiles =
      packageEntries.match(/ppt\/slides\/slide\d+\.xml/g) ?? [];

    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(new Set(slideFiles).size).toBe(4);
  }, 30_000);
});
