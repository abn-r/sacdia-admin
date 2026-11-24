export const FINANCE_MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export type FinanceMonthKey = (typeof FINANCE_MONTH_KEYS)[number];

export type FinancePeriod = { year: number; month?: number };

/** `"2026-11"` for one month, `"2026"` for the whole year. */
export function periodToValue(period: FinancePeriod): string {
  return period.month
    ? `${period.year}-${String(period.month).padStart(2, "0")}`
    : String(period.year);
}

export function valueToPeriod(value: string): FinancePeriod | null {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  return month ? { year, month } : { year };
}

/**
 * Periods offered by the single month selector: for the current year and the
 * two before, the whole year plus its months (no future months), newest first.
 */
export function buildPeriodOptions(now: Date = new Date()): FinancePeriod[] {
  const currentYear = now.getFullYear();
  const options: FinancePeriod[] = [];
  for (let year = currentYear; year >= currentYear - 2; year -= 1) {
    options.push({ year });
    const last = year === currentYear ? now.getMonth() + 1 : 12;
    for (let month = last; month >= 1; month -= 1) options.push({ year, month });
  }
  return options;
}

/** Year and month of a `YYYY-MM-DD` (or ISO) date, read from the text so no timezone shifts it. */
export function deriveYearMonth(date: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

/** "+$1.00", "−$1.00" or "$0.00": the sign carries the meaning, not only the color. */
export function formatSignedAmount(value: number, format: (abs: number) => string): string {
  if (value > 0) return `+${format(value)}`;
  if (value < 0) return `−${format(Math.abs(value))}`;
  return format(0);
}
