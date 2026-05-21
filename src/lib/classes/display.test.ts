import { describe, expect, it } from "vitest";
import {
  formatClassAvailabilityUntil,
  formatClassDurationRange,
} from "@/lib/classes/display";

describe("class display helpers", () => {
  it("shows null available_until_year_id as no programmed expiration", () => {
    expect(formatClassAvailabilityUntil(null)).toBe("Sin expiración programada");
  });

  it("shows cutoff year id with fallback label", () => {
    expect(formatClassAvailabilityUntil(2026)).toBe(
      "Disponible hasta año eclesiástico Año #2026",
    );
  });

  it("formats single and ranged duration", () => {
    expect(formatClassDurationRange(1, 1)).toBe("1 año");
    expect(formatClassDurationRange(2, 3)).toBe("2–3 años");
  });
});
