import { describe, expect, it } from "vitest";
import { filterCertifications, normalizeCertificationListPage } from "@/lib/certifications/list";

describe("normalizeCertificationListPage", () => {
  it("reads items and the total from meta", () => {
    const page = normalizeCertificationListPage({
      status: "success",
      data: [
        { certification_id: 1, name: "Liderazgo juvenil", description: "Guías Mayores", modules_count: 4, active: true },
        { certification_id: 2, name: "Consejería básica", modules_count: 0, active: false },
      ],
      meta: { page: 1, limit: 20, total: 37, totalPages: 2 },
    });
    expect(page.total).toBe(37);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({ certification_id: 1, modules_count: 4, active: true });
    expect(page.items[1]).toMatchObject({ modules_count: null, active: false, description: null });
  });

  it("falls back to the item count when there is no meta", () => {
    expect(normalizeCertificationListPage([{ certification_id: 1, name: "A" }]).total).toBe(1);
  });
});

describe("filterCertifications", () => {
  const items = normalizeCertificationListPage([
    { certification_id: 1, name: "Liderazgo juvenil", description: "Formación" },
    { certification_id: 2, name: "Consejería básica" },
  ]).items;

  it("ignores case and accents and also searches the description", () => {
    expect(filterCertifications(items, "CONSEJERIA").map((i) => i.certification_id)).toEqual([2]);
    expect(filterCertifications(items, "formacion").map((i) => i.certification_id)).toEqual([1]);
  });

  it("returns everything for an empty query", () => {
    expect(filterCertifications(items, "  ")).toHaveLength(2);
  });
});
