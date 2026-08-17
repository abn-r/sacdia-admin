import { describe, expect, it } from "vitest";
import {
  collectSelectedClubSections,
  filterChurchesByDistrict,
  filterDistrictsByLocalField,
  toClubTypeOptions,
  toChurchOptions,
  toDistrictOptions,
  toLocalFieldOptions,
} from "@/lib/clubs/create-form-options";

describe("club create form options", () => {
  it("keeps parent ids needed by chained geography selects", () => {
    const localFields = toLocalFieldOptions([
      { local_field_id: 10, name: "Norte", active: true },
      { local_field_id: 11, name: "Sur", active: false },
    ]);
    const districts = toDistrictOptions([
      { districlub_type_id: 20, name: "Distrito A", local_field_id: 10 },
      { district_id: 21, name: "Distrito B", local_field_id: 11 },
    ]);
    const churches = toChurchOptions([
      { church_id: 30, name: "Central", districlub_type_id: 20 },
      { church_id: 31, name: "Oriente", district_id: 21 },
    ]);

    expect(localFields).toEqual([{ label: "Norte", value: 10 }]);
    expect(districts).toEqual([
      { label: "Distrito A", value: 20, localFieldId: 10 },
      { label: "Distrito B", value: 21, localFieldId: 11 },
    ]);
    expect(churches).toEqual([
      { label: "Central", value: 30, districtId: 20 },
      { label: "Oriente", value: 31, districtId: 21 },
    ]);
  });

  it("does not expose child options before their parent is selected", () => {
    const districts = [
      { label: "Distrito A", value: 20, localFieldId: 10 },
      { label: "Distrito B", value: 21, localFieldId: 11 },
    ];
    const churches = [
      { label: "Central", value: 30, districtId: 20 },
      { label: "Oriente", value: 31, districtId: 21 },
    ];

    expect(filterDistrictsByLocalField(districts, null)).toEqual([]);
    expect(filterChurchesByDistrict(churches, null)).toEqual([]);
    expect(filterDistrictsByLocalField(districts, 10)).toEqual([districts[0]]);
    expect(filterChurchesByDistrict(churches, 21)).toEqual([churches[1]]);
  });

  it("normalizes active club type options for section assignment", () => {
    expect(
      toClubTypeOptions([
        { club_type_id: 1, name: "Aventureros", active: true },
        { club_type_id: 2, name: "Conquistadores", active: false },
        { club_type_id: 3, name: "Guías Mayores" },
      ]),
    ).toEqual([
      { label: "Aventureros", value: 1 },
      { label: "Guías Mayores", value: 3 },
    ]);
  });

  it("collects checked section indexes even when earlier options were unchecked", () => {
    const formData = new FormData();
    formData.set("section_club_type_id_1", "2");
    formData.set("section_club_type_id_3", "4");

    expect(collectSelectedClubSections(formData)).toEqual([
      { clubTypeId: 2 },
      { clubTypeId: 4 },
    ]);
  });
});
