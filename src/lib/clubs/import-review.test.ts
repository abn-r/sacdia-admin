import { describe, expect, it } from "vitest";

import {
  CLUBS_IMPORT_MAX_FILE_BYTES,
  checkClubsImportFile,
  exceedsClubsImportRows,
  pageSlice,
  rowsForReviewTab,
} from "./import-review";

describe("checkClubsImportFile", () => {
  it("accepts xlsx, xls and csv within 5 MB", () => {
    expect(checkClubsImportFile({ name: "clubes-valle-alto.xlsx", size: 1000 })).toEqual({ ok: true });
    expect(checkClubsImportFile({ name: "CLUBES.CSV", size: CLUBS_IMPORT_MAX_FILE_BYTES })).toEqual({
      ok: true,
    });
  });

  it("rejects other types and files over 5 MB", () => {
    expect(checkClubsImportFile({ name: "clubes.pdf", size: 10 })).toEqual({ ok: false, reason: "type" });
    expect(
      checkClubsImportFile({ name: "clubes.xlsx", size: CLUBS_IMPORT_MAX_FILE_BYTES + 1 }),
    ).toEqual({ ok: false, reason: "size" });
  });
});

describe("exceedsClubsImportRows", () => {
  it("allows up to 500 rows", () => {
    expect(exceedsClubsImportRows(500)).toBe(false);
    expect(exceedsClubsImportRows(501)).toBe(true);
  });
});

describe("rowsForReviewTab", () => {
  const rows = [
    { name: "Club Horizonte", errors: [] as string[] },
    { name: "", errors: ["Falta el nombre."] },
  ];

  it("shows only the rows with errors on the errors tab", () => {
    expect(rowsForReviewTab(rows, "errors")).toEqual({ tab: "errors", rows: [rows[1]] });
  });

  it("shows everything on the all tab, and when no row has errors", () => {
    expect(rowsForReviewTab(rows, "all").rows).toHaveLength(2);
    expect(rowsForReviewTab([rows[0]!], "errors")).toEqual({ tab: "all", rows: [rows[0]] });
  });
});

describe("pageSlice", () => {
  it("returns the 1-based page", () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(pageSlice(items, 1, 20)).toHaveLength(20);
    expect(pageSlice(items, 3, 20)).toEqual([41, 42, 43, 44, 45]);
  });
});
