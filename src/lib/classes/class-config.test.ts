import { describe, expect, it } from "vitest";
import { parseClassConfigFormData } from "@/lib/classes/class-config";

function makeFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseClassConfigFormData", () => {
  it("rejects max duration lower than min duration", () => {
    const result = parseClassConfigFormData(
      makeFormData({
        min_duration_years: "3",
        max_duration_years: "2",
        available_from_year_id: "",
        available_until_year_id: "",
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("mayor o igual");
    }
  });

  it("accepts null availability and sends default one-year duration", () => {
    const result = parseClassConfigFormData(
      makeFormData({
        min_duration_years: "",
        max_duration_years: "",
        available_from_year_id: "",
        available_until_year_id: "",
      }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        available_from_year_id: null,
        available_until_year_id: null,
        min_duration_years: 1,
        max_duration_years: 1,
      },
    });
  });
});
