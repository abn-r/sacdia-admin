import { SACDIA_DISPLAY_TIMEZONE, formatCalendarDate } from "@/lib/format-locale";

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Formats a civil date ("YYYY-MM-DD", no time zone) without shifting the day.
 * Returns null for empty or unparsable input.
 */
export function formatCivilDate(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const civil = CIVIL_DATE.exec(value);
  const date = civil
    ? new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Formats an instant (ISO timestamp) as a calendar date in the fixed SACDIA
 * display zone. It never depends on the host zone or ICU month names, so the
 * server render and the browser hydration produce the same text.
 */
export function formatInstantDate(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SACDIA_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return formatCalendarDate(`${get("year")}-${get("month")}-${get("day")}`, locale);
}
