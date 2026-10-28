import type {
  MonthlyReportActivityItem,
  MonthlyReportAutoData,
  MonthlyReportDirectivaMember,
  MonthlyReportHonorDetail,
} from "@/lib/api/monthly-reports";

/**
 * Tolerant reader for the NESTED auto-data / snapshot_data produced by the
 * backend (`member_count`, `directiva[]`, `honors{}`, `activities{}`,
 * `finances{}`, `meeting_days`). Legacy flat keys are used only as fallback.
 * Anything missing or malformed resolves to `null` / `[]` (rendered as "—").
 */
export interface ReportAutoSummary {
  members: number | null;
  membersActive: number | null;
  activities: number | null;
  honorsStarted: number | null;
  honorsCompleted: number | null;
  classesCompleted: number | null;
  attendanceRate: number | null;
  income: number | null;
  expenses: number | null;
  balance: number | null;
  totalBalance: number | null;
  transactions: number | null;
  meetingDays: string | null;
  directiva: MonthlyReportDirectivaMember[];
  activityList: MonthlyReportActivityItem[];
  honorDetails: MonthlyReportHonorDetail[];
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? (value.filter((item) => item !== null && typeof item === "object") as T[])
    : [];
}

function first(...values: Array<number | null>): number | null {
  for (const value of values) {
    if (value !== null) return value;
  }
  return null;
}

export function readReportAutoData(
  data: MonthlyReportAutoData | null | undefined,
): ReportAutoSummary {
  const honors = asRecord(data?.honors);
  const activities = asRecord(data?.activities);
  const finances = asRecord(data?.finances);
  const activityList = asArray<MonthlyReportActivityItem>(activities?.list);

  return {
    members: first(asNumber(data?.member_count), asNumber(data?.members_total)),
    membersActive: asNumber(data?.members_active),
    activities: first(
      asNumber(activities?.total),
      asNumber(data?.activities_count),
      activities?.list ? activityList.length : null,
    ),
    honorsStarted: asNumber(honors?.started),
    honorsCompleted: first(asNumber(honors?.completed), asNumber(data?.honors_earned)),
    classesCompleted: asNumber(data?.classes_completed),
    attendanceRate: asNumber(data?.attendance_rate),
    income: asNumber(finances?.income),
    expenses: asNumber(finances?.expenses),
    balance: asNumber(finances?.balance),
    totalBalance: asNumber(finances?.total_balance),
    transactions: asNumber(finances?.transactions),
    meetingDays:
      typeof data?.meeting_days === "string" && data.meeting_days.trim() !== ""
        ? data.meeting_days
        : null,
    directiva: asArray<MonthlyReportDirectivaMember>(data?.directiva),
    activityList,
    honorDetails: asArray<MonthlyReportHonorDetail>(honors?.details),
  };
}

/** True when the payload is an object (even with no recognised keys). */
export function hasReportAutoData(
  data: MonthlyReportAutoData | null | undefined,
): data is MonthlyReportAutoData {
  return asRecord(data) !== null;
}
