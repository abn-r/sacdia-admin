/**
 * Pure rules of the clubs import wizard: file limits (same as the users bulk
 * upload: 500 rows, 5 MB) and the split of the review table.
 */

export const CLUBS_IMPORT_MAX_ROWS = 500;
export const CLUBS_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ImportFileCheck =
  | { ok: true }
  | { ok: false; reason: "type" | "size" };

export function checkClubsImportFile(file: { name: string; size: number }): ImportFileCheck {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return { ok: false, reason: "type" };
  if (file.size > CLUBS_IMPORT_MAX_FILE_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}

export function exceedsClubsImportRows(total: number): boolean {
  return total > CLUBS_IMPORT_MAX_ROWS;
}

export type ReviewTab = "errors" | "all";

/** Rows shown for a tab; a file with no errors always shows everything. */
export function rowsForReviewTab<T extends { errors: unknown[] }>(
  rows: T[],
  tab: string,
): { tab: ReviewTab; rows: T[] } {
  const invalid = rows.filter((row) => row.errors.length > 0);
  if (tab === "all" || invalid.length === 0) return { tab: "all", rows };
  return { tab: "errors", rows: invalid };
}

export function pageSlice<T>(rows: T[], page: number, limit: number): T[] {
  const start = (Math.max(1, page) - 1) * limit;
  return rows.slice(start, start + limit);
}
