"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { apiRequest } from "@/lib/api/client";
import type { CreateUnitPayload, UpdateUnitPayload } from "@/lib/api/units";
import { requireAdminUser } from "@/lib/auth/session";

type UnitsTranslator = Awaited<ReturnType<typeof getTranslations<"units">>>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function collectUnitFieldErrors(
  t: UnitsTranslator,
  formData: FormData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!readString(formData, "name")) {
    errors.name = t("validation.name_required");
  }

  const clubTypeRaw = readString(formData, "club_type_id");
  const clubTypeId = Number(clubTypeRaw);
  if (!clubTypeRaw || !Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    errors.club_type_id = t("validation.club_type_required");
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(
  t: UnitsTranslator,
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
  t: UnitsTranslator,
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

function buildPayload(
  t: UnitsTranslator,
  formData: FormData,
): CreateUnitPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error(t("validation.name_required"));

  const clubTypeId = Number(readString(formData, "club_type_id"));
  if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    throw new Error(t("validation.club_type_required"));
  }

  const captain_id = requireUuid(
    t,
    formData,
    "captain_id",
    t("fields.captain"),
  );
  const secretary_id = requireUuid(
    t,
    formData,
    "secretary_id",
    t("fields.secretary"),
  );
  const advisor_id = requireUuid(
    t,
    formData,
    "advisor_id",
    t("fields.advisor"),
  );
  const substitute_advisor_id = optionalUuid(
    t,
    formData,
    "substitute_advisor_id",
    t("fields.substitute_advisor"),
  );

  return {
    name,
    club_type_id: clubTypeId,
    captain_id,
    secretary_id,
    advisor_id,
    substitute_advisor_id,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUnitAction(
  clubId: number,
  _: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  await requireAdminUser();
  const t = await getTranslations("units");

  const fieldErrors = collectUnitFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload = buildPayload(t, formData);
    await apiRequest<unknown>(`/clubs/${clubId}/units`, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
        endpointLabel: `/clubs/${clubId}/units`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect(`/dashboard/clubs/${clubId}?tab=units`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUnitAction(
  clubId: number,
  unitId: number,
  _: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  await requireAdminUser();
  const t = await getTranslations("units");

  const fieldErrors = collectUnitFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload: UpdateUnitPayload = buildPayload(t, formData);
    await apiRequest<unknown>(`/clubs/${clubId}/units/${unitId}`, {
      method: "PATCH",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/clubs/${clubId}/units/${unitId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect(`/dashboard/clubs/${clubId}?tab=units`);
}
