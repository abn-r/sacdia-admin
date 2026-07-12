import { describe, expect, it } from "vitest";
import {
  buildUnitPayloadFromFormData,
  collectUnitFieldErrors,
} from "./form-payload";

const t = (key: string, values?: Record<string, string>) =>
  values?.field ? `${key}:${values.field}` : key;

function validFormData() {
  const formData = new FormData();
  formData.set("name", "Unidad Águilas");
  formData.set("club_type_id", "2");
  formData.set("club_section_id", "10");
  formData.set("captain_id", "11111111-1111-1111-1111-111111111111");
  formData.set("secretary_id", "22222222-2222-2222-2222-222222222222");
  formData.set("advisor_id", "33333333-3333-3333-3333-333333333333");
  return formData;
}

describe("unit form payload", () => {
  it("includes the selected club section id in create/update payloads", () => {
    expect(buildUnitPayloadFromFormData(t, validFormData())).toEqual(
      expect.objectContaining({
        name: "Unidad Águilas",
        club_type_id: 2,
        club_section_id: 10,
      }),
    );
  });

  it("requires a valid club section id", () => {
    const formData = validFormData();
    formData.delete("club_section_id");

    expect(collectUnitFieldErrors(t, formData)).toEqual(
      expect.objectContaining({
        club_section_id: "validation.club_section_required",
      }),
    );
  });
});
