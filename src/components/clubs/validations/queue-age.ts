/** Same threshold as the backend SLA (`EVIDENCE_REVIEW_OVERDUE_DAYS`). */
export const OVERDUE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days since `iso`; `null` when the date is missing or invalid. */
export function daysWaiting(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / MS_PER_DAY));
}

export function isOverdue(days: number | null): boolean {
  return days !== null && days >= OVERDUE_DAYS;
}
