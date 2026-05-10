/**
 * format-locale — async server getter variants
 *
 * Tests `getFormatDate`, `getFormatDateTime`, `getFormatNumber`, and
 * `getFormatCurrency`. Each getter calls `getLocale()` from `next-intl/server`
 * to resolve the active locale, then returns a formatting closure.
 *
 * Strategy: mock `next-intl/server` at the module level so `getLocale` is a
 * controllable spy. `vi.mock` is hoisted by Vitest, so it runs before any
 * import — the import of the four getters below always receives the mocked
 * version of `next-intl/server`.
 *
 * Cross-suite isolation: this file mocks `next-intl/server` only. The hook
 * tests in format-locale.hooks.test.tsx mock `next-intl` (client) via
 * NextIntlClientProvider — a different module specifier. There is no
 * cross-contamination between the two suites.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mock — must appear before any imports that transitively use getLocale
// ---------------------------------------------------------------------------

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(),
  getRequestConfig: vi.fn(),
}));

import { getLocale } from "next-intl/server";
import {
  getFormatDate,
  getFormatDateTime,
  getFormatNumber,
  getFormatCurrency,
} from "@/lib/format-locale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pin a UTC date whose month name is unambiguous across all four locales. */
const FIXED_DATE = new Date("2024-06-15T12:00:00Z");
const FIXED_ISO = "2024-06-15T12:00:00Z";
const FIXED_TIMESTAMP = FIXED_DATE.getTime();

/**
 * Strip every Unicode whitespace variant (U+0020, U+00A0, U+202F, …) so that
 * fr-FR / pt-BR number assertions are ICU-build-agnostic.
 */
const stripWS = (s: string) => s.replace(/\s/g, "");

// Typed alias for the mocked function
const mockedGetLocale = vi.mocked(getLocale);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getFormatDate
// ---------------------------------------------------------------------------

describe("getFormatDate()", () => {
  it("es locale — result contains year and Spanish month abbreviation", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatDate();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result.toLowerCase()).toMatch(/jun/);
  });

  it("en locale — result contains year and English month abbreviation", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDate();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result).toMatch(/Jun/i);
  });

  it("fr locale — result contains year and French month token", async () => {
    mockedGetLocale.mockResolvedValue("fr");
    const fmt = await getFormatDate();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    // fr-FR short month for June → "juin"
    expect(result.toLowerCase()).toMatch(/juin/);
  });

  it("pt-BR locale — result contains year and Portuguese month abbreviation", async () => {
    mockedGetLocale.mockResolvedValue("pt-BR");
    const fmt = await getFormatDate();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result.toLowerCase()).toMatch(/jun/);
  });

  it("accepts an ISO string as input", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDate();
    expect(fmt(FIXED_ISO)).toContain("2024");
  });

  it("accepts a numeric timestamp as input", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDate();
    expect(fmt(FIXED_TIMESTAMP)).toContain("2024");
  });

  it("respects custom DateTimeFormatOptions passed to the closure", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDate();
    expect(fmt(FIXED_DATE, { year: "numeric" })).toBe("2024");
  });

  it("returns String(value) for an invalid date input", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatDate();
    expect(fmt("not-a-date")).toBe("not-a-date");
  });

  it("locale changes between calls — each await gets the current locale", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmtEs = await getFormatDate();

    mockedGetLocale.mockResolvedValue("fr");
    const fmtFr = await getFormatDate();

    expect(fmtEs(FIXED_DATE).toLowerCase()).toMatch(/jun/);
    // fr-FR uses "juin" whereas es-MX uses "jun." — they differ
    expect(fmtFr(FIXED_DATE).toLowerCase()).toMatch(/juin/);
    expect(fmtEs(FIXED_DATE)).not.toBe(fmtFr(FIXED_DATE));
  });
});

// ---------------------------------------------------------------------------
// getFormatDateTime
// ---------------------------------------------------------------------------

describe("getFormatDateTime()", () => {
  it("es locale — result contains year and time separator", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatDateTime();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result).toMatch(/:/);
  });

  it("en locale — result contains year and time separator", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDateTime();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result).toMatch(/:/);
  });

  it("fr locale — result contains year and time separator", async () => {
    mockedGetLocale.mockResolvedValue("fr");
    const fmt = await getFormatDateTime();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result).toMatch(/:/);
  });

  it("pt-BR locale — result contains year and time separator", async () => {
    mockedGetLocale.mockResolvedValue("pt-BR");
    const fmt = await getFormatDateTime();
    const result = fmt(FIXED_DATE);
    expect(result).toContain("2024");
    expect(result).toMatch(/:/);
  });

  it("respects custom DateTimeFormatOptions passed to the closure", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDateTime();
    // Passing only year option strips the time portion
    expect(fmt(FIXED_DATE, { year: "numeric" })).toBe("2024");
  });

  it("returns String(value) for an invalid date input", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatDateTime();
    expect(fmt("garbage")).toBe("garbage");
  });
});

// ---------------------------------------------------------------------------
// getFormatNumber
// ---------------------------------------------------------------------------

describe("getFormatNumber()", () => {
  it("es locale — 1234 formatted with es-MX comma thousands separator", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatNumber();
    expect(fmt(1234)).toBe("1,234");
  });

  it("en locale — 1234567 formatted with comma separators", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatNumber();
    expect(fmt(1_234_567)).toBe("1,234,567");
  });

  it("fr locale — digits present regardless of ICU NBSP variant", async () => {
    mockedGetLocale.mockResolvedValue("fr");
    const fmt = await getFormatNumber();
    expect(stripWS(fmt(1234))).toContain("1234");
  });

  it("pt-BR locale — digits present regardless of separator style", async () => {
    mockedGetLocale.mockResolvedValue("pt-BR");
    const fmt = await getFormatNumber();
    expect(fmt(1234)).toContain("234");
  });

  it("respects custom NumberFormatOptions — maximumFractionDigits", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatNumber();
    expect(fmt(3.14159, { maximumFractionDigits: 2 })).toBe("3.14");
  });

  it("formats 0 correctly", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatNumber();
    expect(fmt(0)).toBe("0");
  });

  it("formats NaN — Intl.NumberFormat passes it through as 'NaN'", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatNumber();
    expect(fmt(NaN)).toBe("NaN");
  });

  it("locale changes between calls — each await gets the current locale", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmtEs = await getFormatNumber();

    mockedGetLocale.mockResolvedValue("en");
    const fmtEn = await getFormatNumber();

    // es-MX and en-US both use commas for thousands — verify they share correct output
    expect(fmtEs(1234)).toBe("1,234");
    expect(fmtEn(1234)).toBe("1,234");
  });
});

// ---------------------------------------------------------------------------
// getFormatCurrency
// ---------------------------------------------------------------------------

describe("getFormatCurrency()", () => {
  it("es locale with MXN — contains peso symbol and amount", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatCurrency();
    const result = fmt(100, "MXN");
    expect(result).toMatch(/\$|MX\$|MXN/);
    expect(result).toContain("100");
  });

  it("en locale with USD — contains dollar sign and amount", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatCurrency();
    const result = fmt(100, "USD");
    expect(result).toContain("$");
    expect(result).toContain("100");
  });

  it("fr locale with EUR — contains euro symbol and amount", async () => {
    mockedGetLocale.mockResolvedValue("fr");
    const fmt = await getFormatCurrency();
    const result = fmt(100, "EUR");
    expect(result).toContain("€");
    expect(result).toContain("100");
  });

  it("pt-BR locale with BRL — contains R$ symbol and amount", async () => {
    mockedGetLocale.mockResolvedValue("pt-BR");
    const fmt = await getFormatCurrency();
    const result = fmt(100, "BRL");
    expect(result).toContain("R$");
    expect(result).toContain("100");
  });

  it("defaults to MXN when currency argument is omitted", async () => {
    mockedGetLocale.mockResolvedValue("es");
    const fmt = await getFormatCurrency();
    expect(fmt(50)).toBe(fmt(50, "MXN"));
  });

  it("formats zero amount correctly", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatCurrency();
    expect(fmt(0, "USD")).toContain("0");
  });

  it("formats negative amounts — contains minus sign or parentheses", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmt = await getFormatCurrency();
    const result = fmt(-25, "USD");
    expect(result).toContain("25");
    expect(result).toMatch(/-|\(/);
  });

  it("locale changes between calls — each await reflects updated locale", async () => {
    mockedGetLocale.mockResolvedValue("en");
    const fmtEn = await getFormatCurrency();

    mockedGetLocale.mockResolvedValue("fr");
    const fmtFr = await getFormatCurrency();

    const enResult = fmtEn(100, "EUR");
    const frResult = fmtFr(100, "EUR");

    // Both contain the euro symbol and the amount
    expect(enResult).toContain("€");
    expect(frResult).toContain("€");
    // But locale-specific formatting differs (symbol position, separators)
    expect(enResult).not.toBe(frResult);
  });
});
