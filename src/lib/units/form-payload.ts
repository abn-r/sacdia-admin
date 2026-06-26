import type { CreateUnitPayload } from "@/lib/api/units";

export type UnitsFormTranslator = (
  key: string,
  values?: Record<string, string>,
) => string;

export type UnitFieldErrors = Record<string, string>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

export function collectUnitFieldErrors(
  t: UnitsFormTranslator,
  formData: FormData,
): UnitFieldErrors {
  const errors: UnitFieldErrors = {};

  if (!readString(formData, "name")) {
    errors.name = t("validation.name_required");
  }

  const clubTypeRaw = readString(formData, "club_type_id");
  const clubTypeId = Number(clubTypeRaw);
  if (!clubTypeRaw || !Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    errors.club_type_id = t("validation.club_type_required");
  }

  const sectionRaw = readString(formData, "club_section_id");
  const sectionId = Number(sectionRaw);
  if (!sectionRaw || !Number.isFinite(sectionId) || sectionId <= 0) {
    errors.club_section_id = t("validation.club_section_required");
  }

  const requireUuidField = (field: string, label: string) => {
    const value = readString(formData, field);
    if (!value) {
      errors[field] = t("validation.member_required", { field: label });
    } else if (!uuidPattern.test(value)) {
      errors[field] = t("validation.member_invalid", { field: label });
    }
  };

  requireUuidField("captain_id", t("fields.captain"));
  requireUuidField("secretary_id", t("fields.secretary"));
  requireUuidField("advisor_id", t("fields.advisor"));

  const substituteRaw = readString(formData, "substitute_advisor_id");
  if (substituteRaw && !uuidPattern.test(substituteRaw)) {
    errors.substitute_advisor_id = t("validation.member_invalid", {
      field: t("fields.substitute_advisor"),
    });
  }

  return errors;
}

function requireUuid(
  t: UnitsFormTranslator,
  formData: FormData,
  field: string,
  label: string,
): string {
  const value = readString(formData, field);
  if (!value) {
    throw new Error(t("validation.member_required", { field: label }));
  }
  if (!uuidPattern.test(value)) {
    throw new Error(t("validation.member_invalid", { field: label }));
  }
  return value;
}

function optionalUuid(
  t: UnitsFormTranslator,
  formData: FormData,
  field: string,
  label: string,
): string | undefined {
  const value = readString(formData, field);
  if (!value) return undefined;
  if (!uuidPattern.test(value)) {
    throw new Error(t("validation.member_invalid", { field: label }));
  }
  return value;
}

export function buildUnitPayloadFromFormData(
  t: UnitsFormTranslator,
  formData: FormData,
): CreateUnitPayload {
  const fieldErrors = collectUnitFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    throw new Error(Object.values(fieldErrors)[0]);
  }

  const name = readString(formData, "name");
  const clubTypeId = Number(readString(formData, "club_type_id"));
  const clubSectionId = Number(readString(formData, "club_section_id"));

  return {
    name,
    club_type_id: clubTypeId,
    club_section_id: clubSectionId,
    captain_id: requireUuid(
      t,
      formData,
      "captain_id",
      t("fields.captain"),
    ),
    secretary_id: requireUuid(
      t,
      formData,
      "secretary_id",
      t("fields.secretary"),
    ),
    advisor_id: requireUuid(t, formData, "advisor_id", t("fields.advisor")),
    substitute_advisor_id: optionalUuid(
      t,
      formData,
      "substitute_advisor_id",
      t("fields.substitute_advisor"),
    ),
  };
}
