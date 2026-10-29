import { describe, expect, it } from "vitest";
import {
  ecclesiasticalYearLabelFromDates,
  resolveTemplateYearLabel,
  resolveYearLabelById,
} from "./ecclesiastical-year-label";

const fallback = (id: number) => `Año ${id}`;

describe("ecclesiasticalYearLabelFromDates", () => {
  it("returns a single year when start and end share the calendar year", () => {
    expect(
      ecclesiasticalYearLabelFromDates({
        start_date: "2026-01-01",
        end_date: "2026-12-31",
      }),
    ).toBe("2026");
  });

  it("returns a range when the year spans two calendar years", () => {
    expect(
      ecclesiasticalYearLabelFromDates({
        start_date: "2026-07-01T00:00:00.000Z",
        end_date: "2027-06-30T00:00:00.000Z",
      }),
    ).toBe("2026-2027");
  });

  it("uses the start year when the end date is missing", () => {
    expect(ecclesiasticalYearLabelFromDates({ start_date: "2027-01-01" })).toBe("2027");
  });

  it("returns null when there are no usable dates", () => {
    expect(ecclesiasticalYearLabelFromDates(null)).toBeNull();
    expect(ecclesiasticalYearLabelFromDates({ start_date: "" })).toBeNull();
  });
});

describe("resolveTemplateYearLabel", () => {
  it("prefers the catalog name", () => {
    expect(
      resolveTemplateYearLabel(
        { ecclesiastical_year_id: 2 },
        [{ ecclesiastical_year_id: 2, name: "2027" }],
        fallback,
      ),
    ).toBe("2027");
  });

  it("derives the label from the embedded dates when the catalog lacks the year", () => {
    expect(
      resolveTemplateYearLabel(
        {
          ecclesiastical_year_id: 1,
          ecclesiastical_year: { start_date: "2026-01-01", end_date: "2026-12-31" },
        },
        [],
        fallback,
      ),
    ).toBe("2026");
  });

  it("falls back to the id only as a last resort", () => {
    expect(
      resolveTemplateYearLabel({ ecclesiastical_year_id: 7 }, [], fallback),
    ).toBe("Año 7");
  });
});

describe("resolveYearLabelById", () => {
  const years = [
    { ecclesiastical_year_id: 1, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31" },
    { ecclesiastical_year_id: 2, name: " ", start_date: "2026-07-01", end_date: "2027-06-30" },
  ];

  it("uses the catalog name", () => {
    expect(resolveYearLabelById(years, 1)).toBe("2026");
  });

  it("derives the label from the dates when the name is empty", () => {
    expect(resolveYearLabelById(years, 2)).toBe("2026-2027");
  });

  it("returns null for a year that is not in the catalog", () => {
    expect(resolveYearLabelById(years, 9)).toBeNull();
  });
});
