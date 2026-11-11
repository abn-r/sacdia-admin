import {
  FINANCE_CLOSED_PERIOD_NOTE_REQUIRED,
  FINANCE_PERIOD_CLOSED,
  POST_CLOSING_NOTE_MAX,
  POST_CLOSING_NOTE_MIN,
  getFinanceErrorCode,
} from "@/lib/api/finances";

export type FinanceClosedPeriodError = "closed_note_required" | "period_closed";

/** Maps the backend closed-month codes to a `finances.errors.*` message key. */
export function getClosedPeriodErrorKey(
  error: unknown,
): FinanceClosedPeriodError | null {
  const code = getFinanceErrorCode(error);
  if (code === FINANCE_CLOSED_PERIOD_NOTE_REQUIRED) return "closed_note_required";
  if (code === FINANCE_PERIOD_CLOSED) return "period_closed";
  return null;
}

/** Trimmed note when it satisfies the 5-500 rule; null otherwise. */
export function normalizePostClosingNote(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length >= POST_CLOSING_NOTE_MIN &&
    trimmed.length <= POST_CLOSING_NOTE_MAX
    ? trimmed
    : null;
}
