import { describe, expect, it } from "vitest";

import { BULK_USER_HEADERS, checkBulkUsersMatrix } from "@/lib/users/bulk-upload-file";

const HEADER = [...BULK_USER_HEADERS];
const ROW = ["ana@example.test", "Ana", "Pérez", "", "member", "", "", "4"];

describe("checkBulkUsersMatrix", () => {
  it("accepts the eight template headers in any case and order", () => {
    const shuffled = [...HEADER].reverse().map((h) => ` ${h.toUpperCase()} `);
    const result = checkBulkUsersMatrix([shuffled, [...ROW].reverse()]);
    expect(result).toMatchObject({ ok: true, total: 1 });
    if (result.ok) expect(result.rows[0].email).toBe("ana@example.test");
  });

  it("names every column the backend would reject the file for", () => {
    expect(checkBulkUsersMatrix([["email"], ["ana@example.test"]])).toEqual({
      ok: false,
      reason: "missing-headers",
      missing: HEADER.filter((h) => h !== "email"),
    });
  });

  it("reads the header row even when the first data row has an empty email", () => {
    const result = checkBulkUsersMatrix([HEADER, ["", "Ana", "Pérez", "", "member", "", "", ""]]);
    expect(result).toMatchObject({ ok: true, total: 1 });
  });

  it("ignores a trailing empty column and blank rows", () => {
    const result = checkBulkUsersMatrix([
      [...HEADER, ""],
      [...ROW, ""],
      ["", "", "", "", "", "", "", "", ""],
      [],
    ]);
    expect(result).toMatchObject({ ok: true, total: 1 });
    if (result.ok) expect(Object.keys(result.rows[0])).toEqual(HEADER);
  });

  it("rejects a file with headers and no data rows", () => {
    expect(checkBulkUsersMatrix([HEADER, [""]])).toEqual({ ok: false, reason: "empty" });
    expect(checkBulkUsersMatrix([])).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects more than 500 data rows", () => {
    const rows = Array.from({ length: 501 }, () => ROW);
    expect(checkBulkUsersMatrix([HEADER, ...rows])).toEqual({
      ok: false,
      reason: "too-many-rows",
      total: 501,
    });
  });
});
