import { describe, expect, it } from "vitest";
import { formatCivilDate, formatInstantDate } from "./format-date";

describe("formatInstantDate", () => {
  it("renders the calendar date in the fixed display zone (America/Mexico_City), not the host zone", () => {
    // 2026-10-01T03:00Z is still 30 Sep at 21:00 in Mexico City (UTC-6).
    expect(formatInstantDate("2026-10-01T03:00:00.000Z", "es")).toBe("30 sep 2026");
    // 2026-10-01T15:00Z is 1 Oct at 09:00 in Mexico City.
    expect(formatInstantDate("2026-10-01T15:00:00.000Z", "es")).toBe("1 oct 2026");
  });

  it("uses locale month names from the repo tables so SSR and browser agree", () => {
    expect(formatInstantDate("2026-10-01T15:00:00.000Z", "en")).toBe("1 Oct 2026");
    expect(formatInstantDate("2026-10-01T15:00:00.000Z", "pt-BR")).toBe("1 out 2026");
    expect(formatInstantDate("2026-10-01T15:00:00.000Z", "fr")).toBe("1 oct 2026");
  });

  it("returns null for empty input and the raw value when unparsable", () => {
    expect(formatInstantDate(null, "es")).toBeNull();
    expect(formatInstantDate("", "es")).toBeNull();
    expect(formatInstantDate("not-a-date", "es")).toBe("not-a-date");
  });
});

describe("formatCivilDate", () => {
  it("does not shift the day", () => {
    expect(formatCivilDate("2026-11-20", "es")).toContain("20");
  });
});
