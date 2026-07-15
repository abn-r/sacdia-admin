import type { Activity } from "@/lib/api/activities";
import { WEEK_STARTS_ON } from "@/lib/calendar/constants";

type AnyRecord = Record<string, unknown>;

export function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
    const nested = root.data as AnyRecord | null;
    if (nested && typeof nested === "object" && Array.isArray(nested.data)) {
      return nested.data as AnyRecord[];
    }
  }
  return [];
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickDateString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

export function normalizeActivity(
  raw: AnyRecord,
  clubName?: string | null,
): Activity {
  const activityDate =
    pickDateString(raw.activity_date) ?? pickDateString(raw.created_at);

  return {
    activity_id: Number(raw.activity_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: pickString(raw.description),
    club_id: Number(raw.club_id ?? 0),
    club_name: clubName ?? pickString(raw.club_name),
    club_type_id: Number(raw.club_type_id ?? 0),
    club_section_id: Number(raw.club_section_id ?? 0),
    lat: Number(raw.lat ?? 0),
    long: Number(raw.long ?? 0),
    activity_date: activityDate,
    activity_end_date: pickDateString(raw.activity_end_date),
    activity_time: pickString(raw.activity_time),
    activity_place: String(raw.activity_place ?? ""),
    image: pickString(raw.image),
    platform: typeof raw.platform === "number" ? raw.platform : null,
    activity_type_id: Number(raw.activity_type_id ?? 0),
    activity_type:
      raw.activity_type && typeof raw.activity_type === "object"
        ? (raw.activity_type as Activity["activity_type"])
        : null,
    link_meet: pickString(raw.link_meet),
    additional_data: pickString(raw.additional_data),
    classes: Array.isArray(raw.classes) ? (raw.classes as number[]) : [],
    active: raw.active !== false,
    created_at: pickString(raw.created_at),
    updated_at: pickString(raw.updated_at),
  };
}

export function normalizeActivities(
  payload: unknown,
  clubName?: string | null,
): Activity[] {
  return extractArray(payload)
    .map((raw) => normalizeActivity(raw, clubName))
    .filter((activity) => activity.activity_id > 0);
}

export function getActivityDateKey(activity: Activity): string | null {
  return activity.activity_date ?? null;
}

export function activityOccursOnDate(activity: Activity, dateKey: string): boolean {
  const start = getActivityDateKey(activity);
  if (!start) return false;
  const end = activity.activity_end_date ?? start;
  return dateKey >= start && dateKey <= end;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function startOfWeek(date: Date, weekStartsOn = WEEK_STARTS_ON): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthGridDays(anchor: Date, weekStartsOn = WEEK_STARTS_ON): Date[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const gridEnd = addDays(startOfWeek(monthEnd, weekStartsOn), 6);

  const days: Date[] = [];
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

export function getWeekDays(anchor: Date, weekStartsOn = WEEK_STARTS_ON): Date[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export type ActivityCalendarView = "month" | "week" | "day";

function compareDateKeys(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const timeA = parseDateKey(a).getTime();
  const timeB = parseDateKey(b).getTime();
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
    return a.localeCompare(b);
  }
  return timeA - timeB;
}

function parseActivityTimeMinutes(time: string | null | undefined): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function activityOverlapsDateRange(
  activity: Activity,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const start = getActivityDateKey(activity);
  if (!start) return false;
  const end = activity.activity_end_date ?? start;
  return start <= rangeEnd && end >= rangeStart;
}

export function filterActivitiesByPeriod(
  activities: Activity[],
  view: ActivityCalendarView,
  anchor: Date,
): Activity[] {
  if (view === "day") {
    const dateKey = toDateKey(anchor);
    return activities.filter((activity) => activityOccursOnDate(activity, dateKey));
  }

  if (view === "week") {
    const weekDays = getWeekDays(anchor);
    const rangeStart = toDateKey(weekDays[0]!);
    const rangeEnd = toDateKey(weekDays[weekDays.length - 1]!);
    return activities.filter((activity) =>
      activityOverlapsDateRange(activity, rangeStart, rangeEnd),
    );
  }

  const rangeStart = toDateKey(startOfMonth(anchor));
  const rangeEnd = toDateKey(endOfMonth(anchor));
  return activities.filter((activity) =>
    activityOverlapsDateRange(activity, rangeStart, rangeEnd),
  );
}

export function sortActivitiesByTime(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const dateCmp = compareDateKeys(getActivityDateKey(a), getActivityDateKey(b));
    if (dateCmp !== 0) return dateCmp;
    return (
      parseActivityTimeMinutes(a.activity_time) -
      parseActivityTimeMinutes(b.activity_time)
    );
  });
}

export function groupActivitiesByDate(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const activity of activities) {
    const start = getActivityDateKey(activity);
    if (!start) continue;
    const end = activity.activity_end_date ?? start;
    for (
      let cursor = parseDateKey(start);
      toDateKey(cursor) <= end;
      cursor = addDays(cursor, 1)
    ) {
      const key = toDateKey(cursor);
      const bucket = map.get(key) ?? [];
      bucket.push(activity);
      map.set(key, bucket);
    }
  }
  for (const [key, bucket] of map.entries()) {
    map.set(key, sortActivitiesByTime(bucket));
  }
  return map;
}

export const ACTIVITIES_BASE_PATH = "/dashboard/clubs/activities";

export function activityDetailPath(activityId: number): string {
  return `${ACTIVITIES_BASE_PATH}/${activityId}`;
}
