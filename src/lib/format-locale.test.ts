import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatCalendarDateRange,
  formatMxnAmount,
  formatTabularNumber,
  formatTimestamp,
  parseIsoDateParts,
} from "@/lib/format-locale";

describe("parseIsoDateParts", () => {
  it("lee el prefijo YYYY-MM-DD aunque el valor traiga medianoche UTC", () => {
    expect(parseIsoDateParts("2026-08-21")).toEqual({ year: 2026, month: 8, day: 21 });
    expect(parseIsoDateParts("2026-08-21T00:00:00.000Z")).toEqual({
      year: 2026,
      month: 8,
      day: 21,
    });
  });

  it("rechaza valores vacíos", () => {
    expect(parseIsoDateParts(null)).toBeNull();
    expect(parseIsoDateParts("")).toBeNull();
    expect(parseIsoDateParts("no-fecha")).toBeNull();
  });
});

describe("formatCalendarDate", () => {
  it("conserva el día de calendario en America/Mexico_City", () => {
    expect(formatCalendarDate("2026-08-21", "es")).toBe("21 ago 2026");
    expect(formatCalendarDate("2026-08-21T00:00:00.000Z", "es", "long")).toBe(
      "21 de agosto de 2026",
    );
    expect(formatCalendarDate("2026-08-21", "es", "numeric")).toBe("21/08/2026");
  });
});

describe("formatCalendarDateRange", () => {
  it("separa rango y año", () => {
    expect(formatCalendarDateRange("2026-08-21", "2026-08-23", "es")).toEqual({
      range: "21 ago – 23 ago",
      year: "2026",
    });
  });
});

describe("formatTimestamp", () => {
  it("formatea closed_at en America/Mexico_City con partes numéricas", () => {
    expect(formatTimestamp("2026-08-19T20:58:24.000Z")).toBe("19/08/2026 14:58");
  });
});

describe("formatTabularNumber", () => {
  it("usa punto decimal ASCII sin agrupación", () => {
    expect(formatTabularNumber(170)).toBe("170");
    expect(formatTabularNumber(75.5)).toBe("75.5");
    expect(formatTabularNumber(85)).toBe("85");
  });
});

describe("formatMxnAmount", () => {
  it("fija dos decimales ASCII", () => {
    expect(formatMxnAmount(450)).toBe("$450.00");
  });
});
