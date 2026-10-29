import { describe, expect, it } from "vitest";

import { formatFinanceSectionOption } from "./club-sections";

describe("formatFinanceSectionOption", () => {
  it("shows the name once when the section name equals its club type", () => {
    expect(
      formatFinanceSectionOption({
        name: "Aventureros",
        club_type: { name: "Aventureros" },
      }),
    ).toBe("Aventureros");
  });

  it("ignores case and surrounding spaces when comparing", () => {
    expect(
      formatFinanceSectionOption({
        name: " aventureros ",
        club_type: { name: "Aventureros" },
      }),
    ).toBe("aventureros");
  });

  it("appends the club type when the names differ", () => {
    expect(
      formatFinanceSectionOption({
        name: "Orión",
        club_type: { name: "Conquistadores" },
      }),
    ).toBe("Orión (Conquistadores)");
  });

  it("falls back to the available name", () => {
    expect(formatFinanceSectionOption({ name: "Orión" })).toBe("Orión");
    expect(
      formatFinanceSectionOption({ name: null, club_type: { name: "Guías Mayores" } }),
    ).toBe("Guías Mayores");
  });
});
