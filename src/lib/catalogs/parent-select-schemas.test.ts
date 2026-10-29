import { describe, expect, it } from "vitest";
import { districtFormSchema } from "@/lib/catalogs/districts/schema";
import { churchFormSchema } from "@/lib/catalogs/churches/schema";

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message;
}

describe("catalog parent selects", () => {
  it("asks for the local field when the district has none (null from an empty select)", () => {
    const result = districtFormSchema.safeParse({ name: "Centro", local_field_id: null, active: true });
    expect(firstMessage(result)).toBe("Selecciona un campo local.");
  });

  it("asks for the district when the church has none", () => {
    const result = churchFormSchema.safeParse({ name: "Central", district_id: null, active: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain("El distrito es obligatorio.");
  });
});
