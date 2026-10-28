/**
 * Client-side checks for the bulk user upload file. They mirror the backend
 * (`AdminUsersService` bulk import): the header row must hold all eight
 * columns, at most 500 data rows. Cells may be empty; the backend validates
 * each row and reports per-row errors.
 */

export const BULK_USER_HEADERS = [
  "email",
  "name",
  "paternal_last_name",
  "maternal_last_name",
  "role",
  "country_id",
  "union_id",
  "local_field_id",
] as const;

export const BULK_USER_MAX_ROWS = 500;

export type BulkPreviewRow = Record<string, string>;

export type BulkFileCheck =
  | { ok: true; rows: BulkPreviewRow[]; total: number }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "missing-headers"; missing: string[] }
  | { ok: false; reason: "too-many-rows"; total: number };

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * `matrix` is the first sheet as rows of cells (`sheet_to_json` with
 * `header: 1`). Reads the real header row (not the first data row), ignores
 * columns without a header and rows with no value at all.
 */
export function checkBulkUsersMatrix(matrix: unknown[][]): BulkFileCheck {
  const nonBlank = matrix.filter(
    (row) => Array.isArray(row) && row.some((cell) => cellText(cell) !== ""),
  );
  if (nonBlank.length === 0) return { ok: false, reason: "empty" };

  const headers = nonBlank[0].map((cell) => cellText(cell).toLowerCase());
  const missing = BULK_USER_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) return { ok: false, reason: "missing-headers", missing };

  const dataRows = nonBlank.slice(1);
  if (dataRows.length === 0) return { ok: false, reason: "empty" };
  if (dataRows.length > BULK_USER_MAX_ROWS) {
    return { ok: false, reason: "too-many-rows", total: dataRows.length };
  }

  const rows = dataRows.map((row) => {
    const record: BulkPreviewRow = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cellText(row[index]);
    });
    return record;
  });

  return { ok: true, rows, total: rows.length };
}
