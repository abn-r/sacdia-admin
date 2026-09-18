import { findMasterGuidesClubTypeId } from "@/lib/clubs/club-type";

export type SelectOption = { label: string; value: number };
export type DistrictOption = SelectOption & { localFieldId: number };
export type ChurchOption = SelectOption & { districtId: number };
export type SelectedClubSection = { clubTypeId: number };

type RawCatalogItem = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isActive(item: RawCatalogItem) {
  return item.active !== false;
}

function labelFor(item: RawCatalogItem, id: number) {
  const name = item.name;
  return typeof name === "string" && name.trim() ? name.trim() : `#${id}`;
}

export function toLocalFieldOptions(items: RawCatalogItem[]): SelectOption[] {
  return items.flatMap((item) => {
    if (!isActive(item)) return [];
    const id = toPositiveNumber(item.local_field_id);
    return id ? [{ label: labelFor(item, id), value: id }] : [];
  });
}

export function toDistrictOptions(items: RawCatalogItem[]): DistrictOption[] {
  return items.flatMap((item) => {
    if (!isActive(item)) return [];
    const id = toPositiveNumber(item.districlub_type_id ?? item.district_id);
    const localFieldId = toPositiveNumber(item.local_field_id);
    return id && localFieldId
      ? [{ label: labelFor(item, id), value: id, localFieldId }]
      : [];
  });
}

export function toChurchOptions(items: RawCatalogItem[]): ChurchOption[] {
  return items.flatMap((item) => {
    if (!isActive(item)) return [];
    const id = toPositiveNumber(item.church_id);
    const districtId = toPositiveNumber(item.districlub_type_id ?? item.district_id);
    return id && districtId
      ? [{ label: labelFor(item, id), value: id, districtId }]
      : [];
  });
}

export function toClubTypeOptions(items: RawCatalogItem[]): SelectOption[] {
  return items.flatMap((item) => {
    if (!isActive(item)) return [];
    const id = toPositiveNumber(item.club_type_id);
    return id ? [{ label: labelFor(item, id), value: id }] : [];
  });
}

export function filterDistrictsByLocalField(
  districts: DistrictOption[],
  localFieldId: number | null,
): DistrictOption[] {
  if (!localFieldId) return [];
  return districts.filter((district) => district.localFieldId === localFieldId);
}

export function filterChurchesByDistrict(
  churches: ChurchOption[],
  districtId: number | null,
): ChurchOption[] {
  if (!districtId) return [];
  return churches.filter((church) => church.districtId === districtId);
}

/**
 * Preselect the actor's local field when the territory is LF-scoped
 * (`director-lf` / `assistant-lf`). If the picker has a single option,
 * use that too so the chain district → church can open.
 */
export function resolveClubCreateLocalFieldDefault(
  localFields: SelectOption[],
  preferredId?: number | null,
): { value: string; locked: boolean } {
  if (
    typeof preferredId === "number" &&
    Number.isFinite(preferredId) &&
    preferredId > 0 &&
    localFields.some((field) => field.value === preferredId)
  ) {
    return { value: String(preferredId), locked: true };
  }
  if (localFields.length === 1) {
    return { value: String(localFields[0]!.value), locked: true };
  }
  return { value: "", locked: false };
}

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

export function collectSelectedClubSections(
  formData: FormData,
  clubTypes: SelectOption[] = [],
): SelectedClubSection[] {
  const indexes = Array.from(formData.keys())
    .map((key) => key.match(/^section_club_type_id_(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);

  const selected = indexes.flatMap((index) => {
    const clubTypeId = toPositiveNumber(
      readString(formData, `section_club_type_id_${index}`),
    );
    if (!clubTypeId) return [];

    return [{ clubTypeId }];
  });

  const masterGuidesClubTypeId = findMasterGuidesClubTypeId(
    clubTypes.map((clubType) => ({
      club_type_id: clubType.value,
      name: clubType.label,
    })),
  );
  if (
    masterGuidesClubTypeId != null &&
    !selected.some((section) => section.clubTypeId === masterGuidesClubTypeId)
  ) {
    selected.push({ clubTypeId: masterGuidesClubTypeId });
  }

  return selected;
}
