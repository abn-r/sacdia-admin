import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatCalendarDateRange,
  formatDate,
  formatMxnAmount,
  formatPercentValue,
  formatQuantity,
  formatTabularNumber,
  formatTimestamp,
  parseDecimalQuantity,
  parseIsoDateParts,
} from "@/lib/format-locale";

const numericDate: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

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

describe("formatDate", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/Mexico_City";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("conserva el día de calendario de una fecha YYYY-MM-DD", () => {
    expect(formatDate("2026-01-01", "es")).toBe("01 ene 2026");
  });

  it("conserva el día de calendario de una columna date serializada a medianoche UTC", () => {
    expect(formatDate("2026-08-19T00:00:00.000Z", "es", numericDate)).toBe("19/08/2026");
  });

  it("muestra los instantes con hora en la zona local", () => {
    expect(formatDate("2026-08-19T02:30:00.000Z", "es", numericDate)).toBe("18/08/2026");
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

describe("formatPercentValue", () => {
  it("redondea a un decimal sin ruido de coma flotante", () => {
    expect(formatPercentValue(28.749999999999996, "es")).toBe("28.7%");
    expect(formatPercentValue(100, "es")).toBe("100%");
    expect(formatPercentValue(0, "es")).toBe("0%");
  });

  it("usa el separador decimal del idioma", () => {
    expect(formatPercentValue(28.75, "fr")).toBe("28,8%");
    expect(formatPercentValue(28.7, "pt-BR")).toBe("28,7%");
  });

  it("devuelve un guion para valores no finitos", () => {
    expect(formatPercentValue(Number.NaN, "es")).toBe("—");
  });
});

describe("parseDecimalQuantity", () => {
  it("parses API decimal strings and numbers", () => {
    expect(parseDecimalQuantity("2.000")).toBe(2);
    expect(parseDecimalQuantity("0.500")).toBe(0.5);
    expect(parseDecimalQuantity(6)).toBe(6);
  });

  it("returns null for empty or non numeric input", () => {
    expect(parseDecimalQuantity("")).toBeNull();
    expect(parseDecimalQuantity("  ")).toBeNull();
    expect(parseDecimalQuantity("abc")).toBeNull();
    expect(parseDecimalQuantity(null)).toBeNull();
    expect(parseDecimalQuantity(undefined)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros of API decimals", () => {
    expect(formatQuantity("2.000", "es")).toBe("2");
    expect(formatQuantity("6.000", "es")).toBe("6");
    expect(formatQuantity("0.000", "es")).toBe("0");
  });

  it("keeps real fractions with the locale separator", () => {
    expect(formatQuantity("2.500", "es")).toBe("2.5");
    expect(formatQuantity("2.500", "en")).toBe("2.5");
    expect(formatQuantity("2.500", "fr")).toBe("2,5");
    expect(formatQuantity("0.125", "pt-BR")).toBe("0,125");
  });

  it("falls back to a dash when there is no number", () => {
    expect(formatQuantity(null, "es")).toBe("—");
    expect(formatQuantity("n/a", "es")).toBe("—");
  });
});
