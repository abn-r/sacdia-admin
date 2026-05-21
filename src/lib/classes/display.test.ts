import { describe, expect, it } from "vitest";
import {
  formatClassAvailabilityUntil,
  formatClassAvailabilityFrom,
  formatClassDurationRange,
  type ClassDisplayLabels,
} from "@/lib/classes/display";

const labels: ClassDisplayLabels = {
  yearSingular: "year",
  yearPlural: "years",
  yearFallback: (id) => `Year #${id}`,
  availableFromAnyYear: "Available from any year",
  noProgrammedExpiration: "No programmed expiration",
  availableFromYear: (label) => `Available from ecclesiastical year ${label}`,
  availableUntilYear: (label) => `Available until ecclesiastical year ${label}`,
};

describe("class display helpers", () => {
  it("shows null available_until_year_id as no programmed expiration", () => {
    expect(formatClassAvailabilityUntil(null, labels)).toBe("No programmed expiration");
  });

  it("shows cutoff year id with fallback label", () => {
    expect(formatClassAvailabilityUntil(2026, labels)).toBe(
      "Available until ecclesiastical year Year #2026",
    );
  });

  it("shows available from using translated labels", () => {
    expect(formatClassAvailabilityFrom(null, labels)).toBe("Available from any year");
    expect(formatClassAvailabilityFrom(2025, labels, "Operational 2025")).toBe(
      "Available from ecclesiastical year Operational 2025",
    );
  });

  it("formats single and ranged duration", () => {
    expect(formatClassDurationRange(1, 1, labels)).toBe("1 year");
    expect(formatClassDurationRange(2, 3, labels)).toBe("2–3 years");
  });
});
