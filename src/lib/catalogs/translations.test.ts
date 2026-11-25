import { describe, expect, it } from "vitest";

import { toCatalogTranslations } from "./translations";

describe("toCatalogTranslations", () => {
  it("keeps editable locales and drops es and unknown ones", () => {
    expect(
      toCatalogTranslations([
        { locale: "es", name: "Primeros auxilios" },
        { locale: "en", name: "First aid", description: "Basics" },
        { locale: "de", name: "Erste Hilfe" },
      ]),
    ).toEqual([{ locale: "en", name: "First aid", description: "Basics" }]);
  });

  it("drops rows with no content and tolerates missing input", () => {
    expect(toCatalogTranslations([{ locale: "fr", name: " ", description: null }])).toEqual([]);
    expect(toCatalogTranslations(undefined)).toEqual([]);
  });
});
