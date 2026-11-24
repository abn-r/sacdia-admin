import { describe, expect, it } from "vitest";
import {
  buildPeriodOptions,
  deriveYearMonth,
  formatSignedAmount,
  periodToValue,
  valueToPeriod,
} from "./period";

describe("finance period helpers", () => {
  it("round-trips month and year values", () => {
    expect(periodToValue({ year: 2026, month: 3 })).toBe("2026-03");
    expect(periodToValue({ year: 2026 })).toBe("2026");
    expect(valueToPeriod("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(valueToPeriod("2026")).toEqual({ year: 2026 });
    expect(valueToPeriod("2026-13")).toBeNull();
    expect(valueToPeriod("abc")).toBeNull();
  });

  it("offers the whole year then its months, without future months", () => {
    const options = buildPeriodOptions(new Date(2026, 10, 24));
    expect(options[0]).toEqual({ year: 2026 });
    expect(options[1]).toEqual({ year: 2026, month: 11 });
    expect(options.some((o) => o.year === 2026 && o.month === 12)).toBe(false);
    expect(options.some((o) => o.year === 2024 && o.month === 12)).toBe(true);
    expect(options.some((o) => o.year === 2023)).toBe(false);
  });

  it("derives year and month from the date text", () => {
    expect(deriveYearMonth("2026-11-24")).toEqual({ year: 2026, month: 11 });
    expect(deriveYearMonth("2026-01-01T00:00:00.000Z")).toEqual({ year: 2026, month: 1 });
    expect(deriveYearMonth("")).toBeNull();
  });

  it("signs amounts", () => {
    const fmt = (n: number) => `$${n}`;
    expect(formatSignedAmount(5, fmt)).toBe("+$5");
    expect(formatSignedAmount(-5, fmt)).toBe("−$5");
    expect(formatSignedAmount(0, fmt)).toBe("$0");
  });
});
