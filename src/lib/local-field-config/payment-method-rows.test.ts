import { describe, expect, it } from "vitest";
import { buildPaymentMethodRows } from "./payment-method-rows";
import type { LocalFieldOption, MaterialConfig } from "@/lib/types/materials";

const fields: LocalFieldOption[] = [
  { local_field_id: 8, name: "Sur", abbreviation: "S" },
  { local_field_id: 9, name: "Norte", abbreviation: "N" },
];

const configs = [
  { local_field_id: 9 },
] as MaterialConfig[];

describe("buildPaymentMethodRows", () => {
  it("lets a union actor manage every visible field", () => {
    const rows = buildPaymentMethodRows(fields, configs, {
      scope: "union",
      unionId: 2,
    });

    expect(rows.map((row) => row.localFieldId)).toEqual([9, 8]);
    expect(rows.every((row) => row.canManage)).toBe(true);
  });

  it("locks a single-scope actor to their own field", () => {
    const rows = buildPaymentMethodRows(fields, configs, {
      scope: "single",
      localFieldId: 9,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        localFieldId: 9,
        canManage: true,
      }),
    ]);
  });
});
