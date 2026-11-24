import { localeToBcp47 } from "@/lib/format-locale";

/** Same cap as the backend (`ACTIVITY_SERIES_MAX_OCCURRENCES`). */
export const SERIES_MAX_OCCURRENCES = 366;

export type SeriesRule =
  | { kind: "weekly"; weekday: number }
  | { kind: "interval"; intervalDays: number };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function atNoonUtc(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function addDaysKey(dateKey: string, days: number): string {
  const date = atNoonUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekdayOf(dateKey: string): number {
  const day = atNoonUtc(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * The dates a repeating activity will have, with the backend's rules: weekly
 * keeps the days from the first date that fall on the chosen weekday; interval
 * steps every N days from the first date. Empty when the inputs do not make a
 * valid range. One past the cap means "too many".
 */
export function expandSeriesDates(input: { start: string; until: string; rule: SeriesRule }): string[] {
  const { start, until, rule } = input;
  if (!DATE_KEY.test(start) || !DATE_KEY.test(until) || Number.isNaN(atNoonUtc(start).getTime())) return [];
  if (until < start) return [];

  const dates: string[] = [];
  if (rule.kind === "interval") {
    if (!Number.isInteger(rule.intervalDays) || rule.intervalDays < 1) return [];
    for (let cursor = start; cursor <= until; cursor = addDaysKey(cursor, rule.intervalDays)) {
      dates.push(cursor);
      if (dates.length > SERIES_MAX_OCCURRENCES) return dates;
    }
    return dates;
  }

  if (!Number.isInteger(rule.weekday) || rule.weekday < 1 || rule.weekday > 7) return [];
  for (let cursor = start; cursor <= until; cursor = addDaysKey(cursor, 1)) {
    if (isoWeekdayOf(cursor) !== rule.weekday) continue;
    dates.push(cursor);
    if (dates.length > SERIES_MAX_OCCURRENCES) return dates;
  }
  return dates;
}

export function isOverSeriesCap(dates: string[]): boolean {
  return dates.length > SERIES_MAX_OCCURRENCES;
}

/**
 * The dates in words, grouped by month: "29 nov, 6, 13 y 20 dic". The list
 * joiner and month names follow the panel language.
 */
export function describeSeriesDates(dates: string[], locale: string, maxMonths = 4): string {
  if (dates.length === 0) return "";
  const bcp47 = localeToBcp47(locale);
  const list = new Intl.ListFormat(bcp47, { style: "long", type: "conjunction" });
  const month = new Intl.DateTimeFormat(bcp47, { month: "short", timeZone: "UTC" });

  const groups: Array<{ yearMonth: string; label: string; days: number[] }> = [];
  for (const key of dates) {
    const date = atNoonUtc(key);
    const yearMonth = key.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.yearMonth === yearMonth) last.days.push(date.getUTCDate());
    else groups.push({ yearMonth, label: month.format(date).replace(".", ""), days: [date.getUTCDate()] });
  }

  const shown = groups.slice(0, maxMonths).map((group) => `${list.format(group.days.map(String))} ${group.label}`);
  const hidden = groups.slice(maxMonths).reduce((total, group) => total + group.days.length, 0);
  return hidden > 0 ? `${shown.join(", ")} …` : shown.join(", ");
}
