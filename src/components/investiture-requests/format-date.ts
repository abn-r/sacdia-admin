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

/** Formats an instant (ISO timestamp) as a calendar date in the viewer's zone. */
export function formatInstantDate(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
