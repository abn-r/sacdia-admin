import { describe, expect, it } from "vitest";
import {
  collectSelectedClubSections,
  filterChurchesByDistrict,
  filterDistrictsByLocalField,
  toClubTypeOptions,
  toChurchOptions,
  toDistrictOptions,
  toLocalFieldOptions,
  resolveClubCreateLocalFieldDefault,
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

  it("preselects and locks the actor local field when it is in the picker", () => {
    const fields = [
      { label: "Norte", value: 10 },
      { label: "Sur", value: 11 },
    ];
    expect(resolveClubCreateLocalFieldDefault(fields, 11)).toEqual({
      value: "11",
      locked: true,
    });
    expect(resolveClubCreateLocalFieldDefault(fields, 99)).toEqual({
      value: "",
      locked: false,
    });
    expect(resolveClubCreateLocalFieldDefault(fields, null)).toEqual({
      value: "",
      locked: false,
    });
  });

  it("locks a single remaining local field even without a preferred id", () => {
    expect(
      resolveClubCreateLocalFieldDefault([{ label: "Norte", value: 10 }]),
    ).toEqual({ value: "10", locked: true });
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

  it("always includes Guías Mayores even when it is missing from FormData", () => {
    const formData = new FormData();
    formData.set("section_club_type_id_0", "10");
    const clubTypes = [
      { label: "Aventureros", value: 10 },
      { label: "Conquistadores", value: 20 },
      { label: "Guías Mayores", value: 99 },
    ];

    expect(collectSelectedClubSections(formData, clubTypes)).toEqual([
      { clubTypeId: 10 },
      { clubTypeId: 99 },
    ]);
  });

  it("does not duplicate Guías Mayores when the locked checkbox already submitted", () => {
    const formData = new FormData();
    formData.set("section_club_type_id_2", "99");
    const clubTypes = [
      { label: "Aventureros", value: 10 },
      { label: "Guías Mayores", value: 99 },
    ];

    expect(collectSelectedClubSections(formData, clubTypes)).toEqual([
      { clubTypeId: 99 },
    ]);
  });

  it("treats Guías Mayores alone as a valid section selection", () => {
    expect(
      collectSelectedClubSections(new FormData(), [
        { label: "Aventureros", value: 10 },
        { label: "Guías Mayores", value: 99 },
      ]),
    ).toEqual([{ clubTypeId: 99 }]);
  });
});
