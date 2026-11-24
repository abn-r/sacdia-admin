import { describe, expect, it } from "vitest";

import {
  BULK_TEMPLATE_HEADERS,
  reviewBulkUsers,
  summarizeBulkReview,
  type BulkReviewContext,
} from "@/lib/users/bulk-review";

const ctx: BulkReviewContext = {
  allowedRoles: ["coordinator", "user"],
  roleLabels: { coordinator: "Coordinador", user: "Usuario", admin: "Administrador" },
  localFieldRequiredRoles: ["coordinator"],
  catalogs: {
    countries: [
      { id: 1, name: "México" },
      { id: 2, name: "Chile" },
    ],
    unions: [
      { id: 10, name: "Unión Valle Alto", countryId: 1 },
      { id: 11, name: "Unión Costa", countryId: 2 },
    ],
    localFields: [
      { id: 100, name: "Asociación Valle Alto", unionId: 10 },
      { id: 101, name: "Asociación Centro", unionId: 10 },
      { id: 102, name: "Asociación Centro", unionId: 11 },
    ],
  },
};

const H = [...BULK_TEMPLATE_HEADERS];

function review(...rows: string[][]) {
  const result = reviewBulkUsers([H, ...rows], ctx);
  if (!result.ok) throw new Error(`unexpected ${result.reason}`);
  return result.rows;
}

describe("reviewBulkUsers", () => {
  it("resolves union and local field names to ids, ignoring case and accents", () => {
    const [row] = review(["ana@correo.test", "Ana", "Ejemplo", "", "user", "mexico", "UNION valle alto", "asociación valle alto"]);
    expect(row).toMatchObject({ countryId: 1, unionId: 10, localFieldId: 100, issues: [] });
  });

  it("accepts the role label as well as the slug", () => {
    const [row] = review(["ana@correo.test", "Ana", "Ejemplo", "", "Coordinador", "", "", "Asociación Valle Alto"]);
    expect(row).toMatchObject({ role: "coordinator", localFieldId: 100, issues: [] });
  });

  it("infers union and country from the local field alone", () => {
    const [row] = review(["ana@correo.test", "Ana", "Ejemplo", "", "user", "", "", "Asociación Valle Alto"]);
    expect(row).toMatchObject({ countryId: 1, unionId: 10, localFieldId: 100 });
  });

  it("uses the union to tell apart local fields that share a name", () => {
    const [a, b] = review(
      ["a@correo.test", "A", "B", "", "user", "", "Unión Valle Alto", "Asociación Centro"],
      ["b@correo.test", "A", "B", "", "user", "", "Unión Costa", "Asociación Centro"],
    );
    expect(a!.localFieldId).toBe(101);
    expect(b!.localFieldId).toBe(102);
  });

  it("flags a shared name as ambiguous when no union narrows it", () => {
    const [row] = review(["a@correo.test", "A", "B", "", "user", "", "", "Asociación Centro"]);
    expect(row!.issues).toEqual([{ code: "ambiguous", value: "Asociación Centro" }]);
  });

  it("reports a local field that belongs to another union", () => {
    const [row] = review(["a@correo.test", "A", "B", "", "user", "", "Unión Costa", "Asociación Valle Alto"]);
    expect(row!.issues).toEqual([
      { code: "localFieldOutsideUnion", value: "Asociación Valle Alto", parent: "Unión Costa" },
    ]);
  });

  it("reports unknown places without cascading a second error", () => {
    const [row] = review(["a@correo.test", "A", "B", "", "user", "", "Unión Fantasma", "Asociación Valle Alto"]);
    expect(row!.issues).toEqual([{ code: "unionUnknown", value: "Unión Fantasma" }]);
    expect(row!.localFieldId).toBe(100);
  });

  it("flags missing required fields, bad emails, unknown and forbidden roles", () => {
    const rows = review(
      ["", "", "Pérez", "", "user", "", "", ""],
      ["no-es-correo", "Ana", "Pérez", "", "user", "", "", ""],
      ["c@correo.test", "Ana", "Pérez", "", "jefe", "", "", ""],
      ["d@correo.test", "Ana", "Pérez", "", "admin", "", "", ""],
    );
    expect(rows[0]!.issues).toEqual([{ code: "missingRequired", fields: ["email", "name"] }]);
    expect(rows[1]!.issues).toEqual([{ code: "emailInvalid", value: "no-es-correo" }]);
    expect(rows[2]!.issues).toEqual([{ code: "roleUnknown", value: "jefe" }]);
    expect(rows[3]!.issues).toEqual([{ code: "roleNotAllowed", value: "admin" }]);
  });

  it("requires a local field for the roles the backend lists", () => {
    const [row] = review(["a@correo.test", "A", "B", "", "coordinator", "", "", ""]);
    expect(row!.issues).toEqual([{ code: "localFieldRequired" }]);
  });

  it("points a repeated email at its first row, not at the first row itself", () => {
    const rows = review(
      ["a@correo.test", "A", "B", "", "user", "", "", ""],
      ["A@correo.test", "C", "D", "", "user", "", "", ""],
    );
    expect(rows[0]!.issues).toEqual([]);
    expect(rows[1]!.issues).toEqual([{ code: "duplicateEmail", row: 2 }]);
  });

  it("numbers rows like the sheet, counting blank rows", () => {
    const result = reviewBulkUsers(
      [H, [], ["a@correo.test", "A", "B", "", "user", "", "", ""]],
      ctx,
    );
    expect(result.ok && result.rows[0]!.row).toBe(3);
  });

  it("still reads files with the old id columns", () => {
    const result = reviewBulkUsers(
      [
        ["email", "name", "paternal_last_name", "maternal_last_name", "role", "country_id", "union_id", "local_field_id"],
        ["a@correo.test", "A", "B", "", "user", "1", "10", "100"],
        ["b@correo.test", "A", "B", "", "user", "1", "10", "999"],
      ],
      ctx,
    );
    expect(result.ok && result.rows[0]).toMatchObject({ countryId: 1, unionId: 10, localFieldId: 100, issues: [] });
    expect(result.ok && result.rows[1]!.issues).toEqual([{ code: "localFieldUnknown", value: "999" }]);
  });

  it("rejects files without the required columns, empty files and more than 500 rows", () => {
    expect(reviewBulkUsers([["email", "name"], ["a", "b"]], ctx)).toEqual({
      ok: false,
      reason: "missing-headers",
      missing: ["paternal_last_name", "role"],
    });
    expect(reviewBulkUsers([H], ctx)).toEqual({ ok: false, reason: "empty" });
    const many = Array.from({ length: 501 }, (_, i) => [`u${i}@correo.test`, "A", "B", "", "user", "", "", ""]);
    expect(reviewBulkUsers([H, ...many], ctx)).toEqual({ ok: false, reason: "too-many-rows", total: 501 });
  });
});

describe("summarizeBulkReview", () => {
  it("counts rows with and without issues", () => {
    const rows = review(
      ["a@correo.test", "A", "B", "", "user", "", "", ""],
      ["x", "A", "B", "", "user", "", "", ""],
    );
    expect(summarizeBulkReview(rows)).toEqual({ total: 2, ready: 1, withErrors: 1 });
  });
});
