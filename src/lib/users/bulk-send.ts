import type { BulkUserRowResult } from "@/lib/api/admin-users";
import { BULK_USER_HEADERS } from "@/lib/users/bulk-upload-file";
import type { BulkReviewRow } from "@/lib/users/bulk-review";

export const BULK_XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type BulkSendPlan = {
  /** Header row + one row per ready user, with catalog ids (what the API reads). */
  matrix: Array<Array<string | number>>;
  /** `sourceRows[i]` is the sheet row of the user the API will report as row `i + 2`. */
  sourceRows: number[];
};

/** Only rows without issues are sent. */
export function buildBulkSendPlan(rows: readonly BulkReviewRow[]): BulkSendPlan {
  const ready = rows.filter((row) => row.issues.length === 0);
  return {
    matrix: [
      [...BULK_USER_HEADERS],
      ...ready.map((row) => [
        row.email,
        row.name,
        row.paternalLastName,
        row.maternalLastName,
        row.role,
        row.countryId ?? "",
        row.unionId ?? "",
        row.localFieldId ?? "",
      ]),
    ],
    sourceRows: ready.map((row) => row.row),
  };
}

/** Rewrites the API's row numbers (position in the sent file) to the user's sheet rows. */
export function mapBulkResultRows(
  results: readonly BulkUserRowResult[],
  sourceRows: readonly number[],
): BulkUserRowResult[] {
  return results.map((result) => ({
    ...result,
    row: sourceRows[result.row - 2] ?? result.row,
  }));
}
