import {
  filterChurchesByDistrict,
  filterDistrictsByLocalField,
  type ChurchOption,
  type DistrictOption,
  type SelectOption,
} from "@/lib/clubs/create-form-options";

export type ClubCreateGapId =
  | "local-fields"
  | "club-types"
  | "districts"
  | "churches";

export type ClubCreateGap = {
  id: ClubCreateGapId;
  screenId: string;
  contextName?: string;
};

export function findClubCreateGaps(args: {
  localFields: SelectOption[];
  districts: DistrictOption[];
  churches: ChurchOption[];
  clubTypes: SelectOption[];
  selectedLocalFieldId: number | null;
  selectedDistrictId: number | null;
}): ClubCreateGap[] {
  const gaps: ClubCreateGap[] = [];

  if (args.localFields.length === 0) {
    gaps.push({ id: "local-fields", screenId: "catalogs-local-fields" });
  }

  if (args.clubTypes.length === 0) {
    gaps.push({ id: "club-types", screenId: "catalogs-club-types" });
  }

  if (args.localFields.length === 0 || args.selectedLocalFieldId == null) {
    return gaps;
  }

  const fieldDistricts = filterDistrictsByLocalField(
    args.districts,
    args.selectedLocalFieldId,
  );
  const fieldName = args.localFields.find(
    (field) => field.value === args.selectedLocalFieldId,
  )?.label;

  if (fieldDistricts.length === 0) {
    gaps.push({
      id: "districts",
      screenId: "catalogs-districts",
      contextName: fieldName,
    });
    return gaps;
  }

  if (args.selectedDistrictId == null) {
    return gaps;
  }

  const districtChurches = filterChurchesByDistrict(
    args.churches,
    args.selectedDistrictId,
  );
  if (districtChurches.length === 0) {
    const districtName = fieldDistricts.find(
      (district) => district.value === args.selectedDistrictId,
    )?.label;
    gaps.push({
      id: "churches",
      screenId: "catalogs-churches",
      contextName: districtName,
    });
  }

  return gaps;
}
