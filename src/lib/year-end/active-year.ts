type AnyRecord = Record<string, unknown>;

export type ActiveYear = { id: number; name: string };

/**
 * Finds the active ecclesiastical year in `GET /catalogs/ecclesiastical-years`
 * (bare array or `{ data: [...] }`). Returns null when none is active.
 */
export function findActiveYear(payload: unknown): ActiveYear | null {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as AnyRecord).data)
      ? ((payload as AnyRecord).data as unknown[])
      : [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const year = entry as AnyRecord;
    if (year.active !== true) continue;
    const id = Number(year.ecclesiastical_year_id);
    if (!Number.isFinite(id)) continue;
    const name = typeof year.name === "string" && year.name.trim() ? year.name : String(id);
    return { id, name };
  }
  return null;
}
