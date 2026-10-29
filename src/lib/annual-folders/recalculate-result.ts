export type RecalculateOutcome =
  | { kind: "queued" }
  | { kind: "skipped" }
  | { kind: "updated"; count: number }
  | { kind: "done" };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Reads the answer of POST /annual-folders/rankings/recalculate.
 * The backend wraps it as `{ status, data: { queued, skipped, rankings_updated } }`
 * and, with the queue available (the normal case), only answers `queued: true`
 * without any count. Never trust or show the backend `message` (English).
 */
export function readRecalculateOutcome(raw: unknown): RecalculateOutcome {
  const root = asRecord(raw);
  const body = asRecord(root?.data) ?? root;

  if (body?.skipped === true) return { kind: "skipped" };
  if (body?.queued === true) return { kind: "queued" };

  const updated = body?.rankings_updated;
  if (typeof updated === "number" && Number.isFinite(updated)) {
    return { kind: "updated", count: updated };
  }
  return { kind: "done" };
}
