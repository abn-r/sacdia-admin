import { describe, expect, it } from "vitest";
import { abbreviateLabel, abbreviateYearLabel } from "./abbreviate-label";

describe("abbreviateLabel", () => {
  it("returns short strings unchanged", () => {
    expect(abbreviateLabel("Club Norte")).toBe("Club Norte");
  });

  it("truncates long strings with ellipsis", () => {
    expect(abbreviateLabel("Club Conquistadores del Norte", 12)).toBe(
      "Club Conqui…",
    );
  });
});

describe("abbreviateYearLabel", () => {
  it("compresses ecclesiastical year ranges", () => {
    expect(abbreviateYearLabel("2024-2025")).toBe("24-25");
  });

  it("falls back to abbreviateLabel for unknown formats", () => {
    expect(abbreviateYearLabel("Año activo")).toBe("Año act…");
  });
});
