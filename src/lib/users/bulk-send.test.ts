import { describe, expect, it } from "vitest";

import { buildBulkSendPlan, mapBulkResultRows } from "@/lib/users/bulk-send";
import type { BulkReviewRow } from "@/lib/users/bulk-review";

const base = { name: "Ana", paternalLastName: "Ejemplo", maternalLastName: "", role: "user" };
const rows: BulkReviewRow[] = [
  { ...base, row: 2, email: "a@correo.test", unionId: 10, localFieldId: 100, countryId: 1, issues: [] },
  { ...base, row: 3, email: "malo", issues: [{ code: "emailInvalid", value: "malo" }] },
  { ...base, row: 7, email: "c@correo.test", issues: [] },
];

describe("buildBulkSendPlan", () => {
  it("sends only the ready rows, with ids under the API headers", () => {
    const plan = buildBulkSendPlan(rows);
    expect(plan.matrix[0]).toEqual([
      "email", "name", "paternal_last_name", "maternal_last_name", "role", "country_id", "union_id", "local_field_id",
    ]);
    expect(plan.matrix).toHaveLength(3);
    expect(plan.matrix[1]).toEqual(["a@correo.test", "Ana", "Ejemplo", "", "user", 1, 10, 100]);
    expect(plan.matrix[2]).toEqual(["c@correo.test", "Ana", "Ejemplo", "", "user", "", "", ""]);
    expect(plan.sourceRows).toEqual([2, 7]);
  });
});

describe("mapBulkResultRows", () => {
  it("rewrites API row numbers back to the user's sheet rows", () => {
    const mapped = mapBulkResultRows(
      [
        { row: 2, email: "a@correo.test", status: "success" },
        { row: 3, email: "c@correo.test", status: "error", error_code: "EMAIL_ALREADY_IN_USE" },
      ],
      [2, 7],
    );
    expect(mapped.map((r) => r.row)).toEqual([2, 7]);
  });
});
