import { formatCalendarDate, localeToBcp47 } from "@/lib/format-locale";

/**
 * Heading of a camporee day: weekday in the panel locale plus the calendar date
 * ("viernes · 12 feb 2027"). `fecha` is a calendar date (YYYY-MM-DD); it is read
 * in UTC so the day never shifts with the host timezone.
 */
export function formatDayHeading(fecha: string, locale: string): string {
  const date = new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
  const calendar = formatCalendarDate(fecha, locale, "short");
  if (Number.isNaN(date.getTime())) return calendar;
  const weekday = new Intl.DateTimeFormat(localeToBcp47(locale), {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  return `${weekday} · ${calendar}`;
}
