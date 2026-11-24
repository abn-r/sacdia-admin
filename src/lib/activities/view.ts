import type { Activity } from "@/lib/api/activities";
import { localeToBcp47, SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import {
  activityOverlapsDateRange,
  addDays,
  endOfMonth,
  getActivityDateKey,
  parseDateKey,
  sortActivitiesByTime,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "@/lib/activities/helpers";

/** Mes / Semana / Lista share one control. `list` shows the month as rows. */
export type ActivitiesView = "month" | "week" | "list";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

type Param = string | string[] | null | undefined;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** `?view=`; the old day view (and anything unknown) falls back sensibly. */
export function readView(value: Param): ActivitiesView {
  const raw = first(value);
  if (raw === "week" || raw === "day") return "week";
  if (raw === "list") return "list";
  return "month";
}

/** Calendar date of "now" in the panel zone, so the server and the browser agree on "today". */
export function todayKey(now: Date = new Date(), timeZone: string = SACDIA_DISPLAY_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** `?date=` when it is a real calendar date; otherwise the fallback (today). */
export function readAnchor(value: Param, fallback: string): string {
  const raw = first(value);
  if (!raw || !DATE_KEY.test(raw)) return fallback;
  const parsed = parseDateKey(raw);
  return Number.isNaN(parsed.getTime()) || toDateKey(parsed) !== raw ? fallback : raw;
}

export type ActivityPhase = "past" | "today" | "upcoming";

/** Where an activity sits relative to today: past ones are muted, today's gets the accent. */
export function activityPhase(activity: Pick<Activity, "activity_date" | "activity_end_date">, today: string): ActivityPhase {
  const start = activity.activity_date ?? null;
  if (!start) return "upcoming";
  const end = activity.activity_end_date && activity.activity_end_date >= start ? activity.activity_end_date : start;
  if (end < today) return "past";
  if (start <= today) return "today";
  return "upcoming";
}

/** Moves the anchor one period: a month, a week (the list pages by month). */
export function shiftAnchorKey(view: ActivitiesView, anchorKey: string, delta: number): string {
  const anchor = parseDateKey(anchorKey);
  if (view === "week") return toDateKey(addDays(anchor, delta * 7));
  return toDateKey(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
}

export function periodRange(view: ActivitiesView, anchorKey: string): { start: string; end: string } {
  const anchor = parseDateKey(anchorKey);
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { start: toDateKey(start), end: toDateKey(addDays(start, 6)) };
  }
  return { start: toDateKey(startOfMonth(anchor)), end: toDateKey(endOfMonth(anchor)) };
}

/** Activities of the visible period, in order. */
export function activitiesInPeriod(activities: Activity[], view: ActivitiesView, anchorKey: string): Activity[] {
  const { start, end } = periodRange(view, anchorKey);
  return sortActivitiesByTime(activities.filter((activity) => activityOverlapsDateRange(activity, start, end)));
}

function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** "Noviembre 2026" or "22 nov – 28 nov 2026", in the panel language. */
export function formatPeriodLabel(view: ActivitiesView, anchorKey: string, locale: string): string {
  const bcp47 = localeToBcp47(locale);
  const anchor = parseDateKey(anchorKey);
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    const from = start.toLocaleDateString(bcp47, { day: "numeric", month: "short" });
    const to = end.toLocaleDateString(bcp47, { day: "numeric", month: "short", year: "numeric" });
    return `${from} – ${to}`;
  }
  return capitalize(anchor.toLocaleDateString(bcp47, { month: "long", year: "numeric" }), bcp47);
}

/** Short weekday names, Sunday first (the grid's week start), in the panel language. */
export function weekdayLabels(locale: string): string[] {
  const bcp47 = localeToBcp47(locale);
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2026, 10, 1 + index).toLocaleDateString(bcp47, { weekday: "short" }).replace(".", ""),
  );
}

/** "mié" for a date, in the panel language. */
export function formatWeekdayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(localeToBcp47(locale), { weekday: "short" }).replace(".", "");
}

/** A date as "mié 25 nov" in the panel language, from a `YYYY-MM-DD` key. */
export function formatDayLabel(dateKey: string, locale: string): string {
  const bcp47 = localeToBcp47(locale);
  return parseDateKey(dateKey)
    .toLocaleDateString(bcp47, { weekday: "short", day: "numeric", month: "short" })
    .replace(/\./g, "");
}

/** Start key of an activity, or null when it has none. */
export function activityStartKey(activity: Activity): string | null {
  return getActivityDateKey(activity);
}
