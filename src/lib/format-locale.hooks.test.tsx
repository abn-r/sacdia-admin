/**
 * format-locale — React hook variants
 *
 * Tests `useFormatDate`, `useFormatDateTime`, `useFormatNumber`, and
 * `useFormatCurrency`. Each hook calls `useLocale()` from next-intl internally,
 * so every test wraps with `NextIntlClientProvider` to supply the locale.
 *
 * All 4 supported locales are exercised (es, en, fr, pt-BR).
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import {
  useFormatDate,
  useFormatDateTime,
  useFormatNumber,
  useFormatCurrency,
} from "./format-locale";

// ---------------------------------------------------------------------------
// Wrapper factory
// ---------------------------------------------------------------------------

function makeWrapper(locale: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={{}}>
        {children}
      </NextIntlClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Fixed reference values
// ---------------------------------------------------------------------------

// 2024-06-15T12:00:00Z — June 15 2024 at noon UTC. Chosen because the month
// name ("june / juin / junho / junio") is unambiguous across locales.
const FIXED_DATE = new Date("2024-06-15T12:00:00Z");

// ---------------------------------------------------------------------------
// useFormatDate
// ---------------------------------------------------------------------------

describe("useFormatDate()", () => {
  it("es locale — result contains 2024 and a Spanish month abbreviation", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("es"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    // es-MX short month for June → "jun."
    expect(formatted.toLowerCase()).toMatch(/jun/);
  });

  it("en locale — result contains 2024 and an English month abbreviation", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    expect(formatted).toMatch(/Jun/i);
  });

  it("fr locale — result contains 2024 and a French month token", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("fr"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    // fr-FR short month for June → "juin"
    expect(formatted.toLowerCase()).toMatch(/juin/);
  });

  it("pt-BR locale — result contains 2024", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("pt-BR"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    // pt-BR short month for June → "jun."
    expect(formatted.toLowerCase()).toMatch(/jun/);
  });

  it("accepts an ISO string as input", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current("2024-06-15T12:00:00Z");
    expect(formatted).toContain("2024");
  });

  it("accepts a numeric timestamp as input", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(FIXED_DATE.getTime());
    expect(formatted).toContain("2024");
  });

  it("respects custom DateTimeFormatOptions", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(FIXED_DATE, { year: "numeric" });
    expect(formatted).toBe("2024");
  });

  it("returns the raw string for an invalid date", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("es"),
    });
    expect(result.current("not-a-date")).toBe("not-a-date");
  });

  it("different locales produce different output for the same date", () => {
    const { result: resultEs } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("es"),
    });
    const { result: resultFr } = renderHook(() => useFormatDate(), {
      wrapper: makeWrapper("fr"),
    });
    const formattedEs = resultEs.current(FIXED_DATE);
    const formattedFr = resultFr.current(FIXED_DATE);
    // Both contain the year but the month tokens differ
    expect(formattedEs.toLowerCase()).toMatch(/jun/);
    expect(formattedFr.toLowerCase()).toMatch(/juin/);
  });
});

// ---------------------------------------------------------------------------
// useFormatDateTime
// ---------------------------------------------------------------------------

describe("useFormatDateTime()", () => {
  it("es locale — result contains both date and time parts", () => {
    const { result } = renderHook(() => useFormatDateTime(), {
      wrapper: makeWrapper("es"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    expect(formatted).toMatch(/:/); // time separator
  });

  it("en locale — result contains AM/PM or 24-h colon", () => {
    const { result } = renderHook(() => useFormatDateTime(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    expect(formatted).toMatch(/:/);
  });

  it("fr locale — result contains the year and a colon", () => {
    const { result } = renderHook(() => useFormatDateTime(), {
      wrapper: makeWrapper("fr"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    expect(formatted).toMatch(/:/);
  });

  it("pt-BR locale — result contains the year and a colon", () => {
    const { result } = renderHook(() => useFormatDateTime(), {
      wrapper: makeWrapper("pt-BR"),
    });
    const formatted = result.current(FIXED_DATE);
    expect(formatted).toContain("2024");
    expect(formatted).toMatch(/:/);
  });

  it("returns the raw string fallback for an invalid date", () => {
    const { result } = renderHook(() => useFormatDateTime(), {
      wrapper: makeWrapper("en"),
    });
    expect(result.current("garbage")).toBe("garbage");
  });
});

// ---------------------------------------------------------------------------
// useFormatNumber
// ---------------------------------------------------------------------------

describe("useFormatNumber()", () => {
  it("es locale — 1234 formatted as es-MX with comma thousands separator", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("es"),
    });
    expect(result.current(1234)).toBe("1,234");
  });

  it("en locale — 1234567 formatted with commas", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("en"),
    });
    expect(result.current(1_234_567)).toBe("1,234,567");
  });

  it("fr locale — digits present (thousands separator varies by ICU build)", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("fr"),
    });
    const formatted = result.current(1234);
    // Strip all whitespace variants to compare digits only
    expect(formatted.replace(/\s| | /g, "")).toContain("1234");
  });

  it("pt-BR locale — 1234 digits present", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("pt-BR"),
    });
    const formatted = result.current(1234);
    expect(formatted).toContain("234");
  });

  it("respects custom NumberFormatOptions — maximumFractionDigits", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("en"),
    });
    expect(result.current(3.14159, { maximumFractionDigits: 2 })).toBe("3.14");
  });

  it("formats 0", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("es"),
    });
    expect(result.current(0)).toBe("0");
  });

  it("formats negative numbers", () => {
    const { result } = renderHook(() => useFormatNumber(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(-42);
    expect(formatted).toContain("42");
    expect(formatted).toContain("-");
  });
});

// ---------------------------------------------------------------------------
// useFormatCurrency
// ---------------------------------------------------------------------------

describe("useFormatCurrency()", () => {
  it("es locale with MXN — contains peso symbol and amount", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("es"),
    });
    const formatted = result.current(100, "MXN");
    expect(formatted).toMatch(/\$|MX\$|MXN/);
    expect(formatted).toContain("100");
  });

  it("en locale with USD — contains dollar sign and amount", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(100, "USD");
    expect(formatted).toContain("$");
    expect(formatted).toContain("100");
  });

  it("fr locale with EUR — contains euro symbol and amount", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("fr"),
    });
    const formatted = result.current(100, "EUR");
    expect(formatted).toContain("€");
    expect(formatted).toContain("100");
  });

  it("pt-BR locale with BRL — contains R$ symbol and amount", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("pt-BR"),
    });
    const formatted = result.current(100, "BRL");
    expect(formatted).toContain("R$");
    expect(formatted).toContain("100");
  });

  it("defaults to MXN when currency argument is omitted", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("es"),
    });
    const withExplicit = result.current(50, "MXN");
    const withDefault = result.current(50);
    expect(withDefault).toBe(withExplicit);
  });

  it("formats 0 correctly", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(0, "USD");
    expect(formatted).toContain("0");
  });

  it("formats negative amounts", () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: makeWrapper("en"),
    });
    const formatted = result.current(-25, "USD");
    expect(formatted).toContain("25");
    expect(formatted).toMatch(/-|\(/);
  });
});
