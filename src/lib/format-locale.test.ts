import { describe, it, expect } from "vitest";
import {
  localeToBcp47,
  formatDate,
  formatDateTime,
  formatNumber,
  formatCurrency,
} from "./format-locale";

// format-locale.ts exports pure Intl-based formatters plus React hook variants
// and async server getters. Only the pure functions are tested here.
// Hook variants (useFormatDate etc.) require React Testing Library + provider
// setup; async server getters (getFormatDate etc.) require next-intl server
// mocking — both are out of scope for this unit test suite.

// ---------------------------------------------------------------------------
// localeToBcp47
// ---------------------------------------------------------------------------

describe("localeToBcp47()", () => {
  it("maps 'es' to 'es-MX'", () => {
    expect(localeToBcp47("es")).toBe("es-MX");
  });

  it("maps 'en' to 'en-US'", () => {
    expect(localeToBcp47("en")).toBe("en-US");
  });

  it("maps 'fr' to 'fr-FR'", () => {
    expect(localeToBcp47("fr")).toBe("fr-FR");
  });

  it("maps 'pt-BR' to 'pt-BR'", () => {
    expect(localeToBcp47("pt-BR")).toBe("pt-BR");
  });

  it("falls back to 'es-MX' for an unrecognised locale", () => {
    expect(localeToBcp47("xx")).toBe("es-MX");
  });

  it("falls back to 'es-MX' for an empty string", () => {
    expect(localeToBcp47("")).toBe("es-MX");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

// Pin a specific UTC date so tests are timezone-agnostic.
// 2024-06-15T12:00:00Z — Saturday June 15 2024 at noon UTC.
const FIXED_DATE = new Date("2024-06-15T12:00:00Z");
const FIXED_ISO = "2024-06-15T12:00:00Z";
const FIXED_TIMESTAMP = FIXED_DATE.getTime();

describe("formatDate()", () => {
  it("accepts a Date object and formats it in es-MX locale", () => {
    const result = formatDate(FIXED_DATE, "es");
    // Should contain the year 2024
    expect(result).toContain("2024");
  });

  it("accepts an ISO string and formats it in es-MX locale", () => {
    const result = formatDate(FIXED_ISO, "es");
    expect(result).toContain("2024");
  });

  it("accepts a numeric timestamp", () => {
    const result = formatDate(FIXED_TIMESTAMP, "en");
    expect(result).toContain("2024");
  });

  it("returns String(value) fallback for an invalid date string", () => {
    const invalid = "not-a-date";
    expect(formatDate(invalid, "es")).toBe(invalid);
  });

  it("formats with 'en' locale — result is an ASCII string (no NBSP issues)", () => {
    const result = formatDate(FIXED_DATE, "en");
    // en-US short month abbreviation contains only ASCII letters
    expect(result).toMatch(/[A-Za-z]/);
    expect(result).toContain("2024");
  });

  it("formats with 'fr' locale — result contains the year", () => {
    const result = formatDate(FIXED_DATE, "fr");
    expect(result).toContain("2024");
  });

  it("formats with 'pt-BR' locale — result contains the year", () => {
    const result = formatDate(FIXED_DATE, "pt-BR");
    expect(result).toContain("2024");
  });

  it("respects custom DateTimeFormatOptions", () => {
    const result = formatDate(FIXED_DATE, "en", { year: "numeric" });
    expect(result).toBe("2024");
  });

  it("falls back to es-MX for an unknown locale string", () => {
    // Should not throw — unknown locale maps to es-MX via localeToBcp47
    const result = formatDate(FIXED_DATE, "zz");
    expect(result).toContain("2024");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime — delegates to formatDate with extra time options
// ---------------------------------------------------------------------------

describe("formatDateTime()", () => {
  it("returns a string containing both date and time parts for 'es' locale", () => {
    const result = formatDateTime(FIXED_DATE, "es");
    expect(result).toContain("2024");
    // Time portion: should contain at least one colon character
    expect(result).toMatch(/:/);
  });

  it("returns String(value) fallback for an invalid input", () => {
    const invalid = "garbage";
    expect(formatDateTime(invalid, "en")).toBe(invalid);
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------

describe("formatNumber()", () => {
  it("formats 1234 in 'es' locale (es-MX uses comma as thousands separator)", () => {
    const result = formatNumber(1234, "es");
    // es-MX: "1,234"
    expect(result).toBe("1,234");
  });

  it("formats 1234567 in 'en' locale", () => {
    const result = formatNumber(1234567, "en");
    // en-US: "1,234,567"
    expect(result).toBe("1,234,567");
  });

  it("formats 0 correctly", () => {
    expect(formatNumber(0, "es")).toBe("0");
  });

  it("formats negative numbers", () => {
    const result = formatNumber(-42, "en");
    expect(result).toContain("42");
    expect(result).toContain("-");
  });

  it("respects custom NumberFormatOptions (maximumFractionDigits)", () => {
    const result = formatNumber(3.14159, "en", { maximumFractionDigits: 2 });
    expect(result).toBe("3.14");
  });

  it("formats 'fr' locale — uses NBSP or space as thousands separator", () => {
    const result = formatNumber(1234, "fr");
    // fr-FR uses NBSP (U+202F or U+00A0) or space — just verify the digits are present
    expect(result.replace(/\s/g, "").replace(/ /g, "").replace(/ /g, "")).toContain("1234");
  });

  it("formats 'pt-BR' locale", () => {
    const result = formatNumber(1234, "pt-BR");
    // pt-BR uses period as thousands separator: "1.234"
    expect(result).toContain("234");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency()", () => {
  it("formats 100 MXN in 'es' locale — contains MX$ or $ symbol and amount", () => {
    const result = formatCurrency(100, "es", "MXN");
    // es-MX renders MXN as "MX$" or "$"
    expect(result).toMatch(/\$|MX\$|MXN/);
    expect(result).toContain("100");
  });

  it("formats 100 USD in 'en' locale — contains $ symbol", () => {
    const result = formatCurrency(100, "en", "USD");
    expect(result).toContain("$");
    expect(result).toContain("100");
  });

  it("formats 100 EUR in 'fr' locale — contains € symbol", () => {
    const result = formatCurrency(100, "fr", "EUR");
    expect(result).toContain("€");
    expect(result).toContain("100");
  });

  it("formats 100 BRL in 'pt-BR' locale — contains R$ symbol", () => {
    const result = formatCurrency(100, "pt-BR", "BRL");
    expect(result).toContain("R$");
    expect(result).toContain("100");
  });

  it("defaults to MXN when currency argument is omitted", () => {
    const withMXN = formatCurrency(50, "es", "MXN");
    const withDefault = formatCurrency(50, "es");
    expect(withDefault).toBe(withMXN);
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "en", "USD");
    expect(result).toContain("0");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-25, "en", "USD");
    expect(result).toContain("25");
    // Negative currency formatting includes a minus sign or parentheses
    expect(result).toMatch(/-|\(/);
  });
});
