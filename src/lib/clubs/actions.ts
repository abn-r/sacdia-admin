"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  assignInitialClubSectionDirector,
  createClassCounselorAssignment,
  createClub,
  createClubSection,
  createClubRoleAssignment,
  deleteClub,
  revokeClassCounselorAssignment,
  revokeClubRoleAssignment,
  succeedClubSectionDirector,
  updateClassCounselorAssignment,
  updateClub,
  updateClubSection,
  updateClubRoleAssignment,
} from "@/lib/api/clubs";
import type { ClassCounselorResponsibilityType } from "@/lib/api/clubs";
import { unwrapObject } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles } from "@/lib/auth/roles";
import { canUseDirectorSuccession } from "@/lib/auth/director-succession";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import { collectSelectedClubSections } from "@/lib/clubs/create-form-options";

type ClubsTranslator = Awaited<ReturnType<typeof getTranslations<"clubs">>>;

export type ClubSectionSyncResult = {
  action: "created" | "updated" | "deactivated" | "unchanged" | "failed";
  ok: boolean;
  message: string;
  sectionId?: number;
};

export type ClubActionState = {
  error?: string;
  success?: string;
  createdClubId?: number;
  sectionResults?: ClubSectionSyncResult[];
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function buildClubSectionPath(clubId: number, sectionId: number) {
  return `/dashboard/clubs/${clubId}/sections/${sectionId}`;
}

function buildClubDetailPath(clubId: number) {
  return `/dashboard/clubs/${clubId}`;
}

function parseRequiredNumber(
  t: ClubsTranslator,
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const value = readString(formData, fieldName);
  if (!value) {
    throw new Error(t("validation.field_required", { field: label }));
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(t("validation.field_invalid", { field: label }));
  }

  return parsed;
}

function parseOptionalNumber(
  t: ClubsTranslator,
  formData: FormData,
  fieldName: string,
) {
  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(t("validation.field_invalid", { field: fieldName }));
  }

  return parsed;
}

function parseCoordinates(t: ClubsTranslator, formData: FormData) {
  const latRaw = readString(formData, "coordinates_lat");
  const lngRaw = readString(formData, "coordinates_lng");

  if (!latRaw && !lngRaw) {
    return undefined;
  }

  if (!latRaw || !lngRaw) {
    throw new Error(t("validation.coordinates_incomplete"));
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(t("validation.coordinates_invalid"));
  }

  return { lat, lng };
}

function parseOptionalPositiveNumber(
  t: ClubsTranslator,
  formData: FormData,
  fieldName: string,
) {
  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(t("validation.field_invalid", { field: fieldName }));
  }

  return parsed;
}

function parseOptionalNonNegativeInteger(
  t: ClubsTranslator,
  formData: FormData,
  fieldName: string,
) {
  if (!formData.has(fieldName)) {
    return undefined;
  }

  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(t("validation.field_invalid", { field: fieldName }));
  }

  return parsed;
}

function parseOptionalBooleanField(formData: FormData, fieldName: string) {
  if (!formData.has(fieldName)) return undefined;
  const value = readString(formData, fieldName);
  return value === "on" || value === "true" || value === "1";
}

function parseResponsibilityType(
  value: string,
): ClassCounselorResponsibilityType | undefined {
  if (value === "primary" || value === "assistant" || value === "substitute") {
    return value;
  }

  return undefined;
}

function buildCreatePayload(t: ClubsTranslator, formData: FormData) {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error(t("validation.club_name_required"));
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    local_field_id: parseRequiredNumber(
      t,
      formData,
      "local_field_id",
      t("fields.local_field"),
    ),
    districlub_type_id: parseRequiredNumber(
      t,
      formData,
      "district_id",
      t("fields.district"),
    ),
    church_id: parseRequiredNumber(
      t,
      formData,
      "church_id",
      t("fields.church"),
    ),
    address: readString(formData, "address") || undefined,
    coordinates: parseCoordinates(t, formData),
  };
}

function collectFieldErrors(
  t: ClubsTranslator,
  formData: FormData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!readString(formData, "name")) {
    errors.name = t("validation.club_name_required");
  }

  for (const [field, label] of [
    ["local_field_id", t("fields.local_field")],
    ["district_id", t("fields.district")],
    ["church_id", t("fields.church")],
  ] as const) {
    const value = readString(formData, field);
    if (!value) {
      errors[field] = t("validation.field_required", { field: label });
    } else if (!Number.isFinite(Number(value))) {
      errors[field] = t("validation.field_invalid", { field: label });
    }
  }

  const latRaw = readString(formData, "coordinates_lat");
  const lngRaw = readString(formData, "coordinates_lng");
  if ((latRaw || lngRaw) && (!latRaw || !lngRaw)) {
    errors.coordinates = t("validation.coordinates_incomplete");
  } else if (
    latRaw &&
    lngRaw &&
    (!Number.isFinite(Number(latRaw)) || !Number.isFinite(Number(lngRaw)))
  ) {
    errors.coordinates = t("validation.coordinates_invalid");
  }

  return errors;
}

function buildUpdatePayload(t: ClubsTranslator, formData: FormData) {
  const payload: Record<string, unknown> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const address = readString(formData, "address");

  if (name) {
    payload.name = name;
  }

  if (description) {
    payload.description = description;
  }

  if (address) {
    payload.address = address;
  }

  const localFieldId = parseOptionalNumber(t, formData, "local_field_id");
  const districtId = parseOptionalNumber(t, formData, "district_id");
  const churchId = parseOptionalNumber(t, formData, "church_id");

  if (localFieldId !== undefined) {
    payload.local_field_id = localFieldId;
  }

  if (districtId !== undefined) {
    payload.district_id = districtId;
  }

  if (churchId !== undefined) {
    payload.church_id = churchId;
  }

  const coordinates = parseCoordinates(t, formData);
  if (coordinates) {
    payload.coordinates = coordinates;
  }

  if (formData.has("active")) {
    payload.active = formData.get("active") === "on" || formData.get("active") === "true";
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(t("validation.no_changes"));
  }

  return payload;
}


async function ensureLocalFieldInActorScope(
  user: AuthUser,
  localFieldId: number | undefined,
) {
  if (!localFieldId) return;

  const allowedLocalFields = await listLocalFieldsForTerritory(user);
  if (allowedLocalFields.length === 0) {
    return;
  }

  if (!allowedLocalFields.some((field) => field.local_field_id === localFieldId)) {
    throw new Error("El campo local seleccionado está fuera de tu alcance.");
  }
}

async function ensureClubPayloadInActorScope(
  user: AuthUser,
  payload: { local_field_id?: unknown },
) {
  const localFieldId =
    typeof payload.local_field_id === "number" && Number.isFinite(payload.local_field_id)
      ? payload.local_field_id
      : undefined;
  await ensureLocalFieldInActorScope(user, localFieldId);
}

function normalizeCreatedClubId(payload: unknown) {
  const createdClub = unwrapObject<Record<string, unknown>>(payload);
  const candidateIds = [createdClub?.club_id, createdClub?.id];
  for (const candidateId of candidateIds) {
    const parsed = Number(candidateId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeCreatedSectionId(payload: unknown) {
  const created = unwrapObject<Record<string, unknown>>(payload);
  const candidateIds = [created?.club_section_id, created?.id];
  for (const candidateId of candidateIds) {
    const parsed = Number(candidateId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

export async function createClubAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs");

  const fieldErrors = collectFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload = buildCreatePayload(t, formData);
    await ensureClubPayloadInActorScope(user, payload);
    await createClub(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_club_failed"), {
        endpointLabel: "/clubs",
      }),
    };
  }

  revalidatePath("/dashboard/clubs");
  redirect("/dashboard/clubs");
}

export async function createClubWithSectionsAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs");

  const fieldErrors = collectFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let clubId: number | null = null;

  try {
    const payload = buildCreatePayload(t, formData);
    await ensureClubPayloadInActorScope(user, payload);
    const createdPayload = await createClub(payload);
    clubId = normalizeCreatedClubId(createdPayload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_club_failed"), {
        endpointLabel: "/clubs",
      }),
    };
  }

  if (!clubId) {
    return {
      error: t("errors.club_created_no_id"),
    };
  }

  const sectionResults: ClubSectionSyncResult[] = [];
  for (const section of collectSelectedClubSections(formData)) {
    try {
      const result = await createClubSection(clubId, {
        club_type_id: section.clubTypeId,
        name: section.name,
      });
      sectionResults.push({
        action: "created",
        ok: true,
        message: t("success.section_created_short"),
        sectionId: normalizeCreatedSectionId(result),
      });
    } catch (error) {
      sectionResults.push({
        action: "failed",
        ok: false,
        message: getActionErrorMessage(error, t("errors.create_section_failed"), {
          endpointLabel: `/clubs/${clubId}/sections`,
        }),
      });
    }
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath(`/dashboard/clubs/${clubId}`);

  const failed = sectionResults.filter((r) => !r.ok);
  if (failed.length > 0) {
    return {
      error: t("errors.club_created_sections_failed"),
      success: t("success.retry_failed_sections"),
      createdClubId: clubId,
      sectionResults,
    };
  }

  redirect(`/dashboard/clubs/${clubId}`);
}

function collectUpdateFieldErrors(
  t: ClubsTranslator,
  formData: FormData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = readString(formData, "name");
  if (formData.has("name") && !name) {
    errors.name = t("validation.club_name_required");
  }

  for (const field of ["local_field_id", "district_id", "church_id"] as const) {
    const value = readString(formData, field);
    if (value && !Number.isFinite(Number(value))) {
      const label =
        field === "local_field_id"
          ? t("fields.local_field")
          : field === "district_id"
            ? t("fields.district")
            : t("fields.church");
      errors[field] = t("validation.field_invalid", { field: label });
    }
  }

  const latRaw = readString(formData, "coordinates_lat");
  const lngRaw = readString(formData, "coordinates_lng");
  if ((latRaw || lngRaw) && (!latRaw || !lngRaw)) {
    errors.coordinates = t("validation.coordinates_incomplete");
  } else if (
    latRaw &&
    lngRaw &&
    (!Number.isFinite(Number(latRaw)) || !Number.isFinite(Number(lngRaw)))
  ) {
    errors.coordinates = t("validation.coordinates_invalid");
  }

  return errors;
}

export async function updateClubAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs");

  const fieldErrors = collectUpdateFieldErrors(t, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload = buildUpdatePayload(t, formData);
    await ensureClubPayloadInActorScope(user, payload);
    await updateClub(clubId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_club_failed"), {
        endpointLabel: `/clubs/${clubId}`,
      }),
    };
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect("/dashboard/clubs");
}

export async function syncClubSectionsAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const sectionIdRaw = readString(formData, "section_id");
  const name = readString(formData, "name");
  const clubTypeIdRaw = readString(formData, "club_type_id");
  const activeRaw = readString(formData, "active");

  const sectionId = sectionIdRaw ? Number(sectionIdRaw) : null;
  const clubTypeId = clubTypeIdRaw ? Number(clubTypeIdRaw) : null;

  if (!clubTypeId || !Number.isFinite(clubTypeId)) {
    return { error: t("validation.club_type_required") };
  }

  try {
    if (sectionId && Number.isFinite(sectionId)) {
      // Update existing section
      const payload: Record<string, unknown> = {};
      if (name) payload.name = name;
      if (clubTypeId) payload.club_type_id = clubTypeId;
      if (activeRaw) payload.active = activeRaw === "true";

      await updateClubSection(clubId, sectionId, payload);
      revalidatePath(`/dashboard/clubs/${clubId}`);
      return { success: t("success.section_updated") };
    } else {
      // Create new section
      await createClubSection(clubId, {
        club_type_id: clubTypeId,
        name: name || undefined,
      });
      revalidatePath(`/dashboard/clubs/${clubId}`);
      return { success: t("success.section_created") };
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.sync_section_failed"), {
        endpointLabel: `/clubs/${clubId}/sections`,
      }),
    };
  }
}

export async function deleteClubAction(formData: FormData) {
  await requireAdminUser();

  const clubId = Number(formData.get("id"));
  if (!Number.isFinite(clubId) || clubId <= 0) {
    return;
  }

  await deleteClub(clubId);
  revalidatePath("/dashboard/clubs");
  redirect("/dashboard/clubs");
}

export async function createClubSectionAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const clubTypeIdRaw = readString(formData, "club_type_id");
  const clubTypeId = Number(clubTypeIdRaw);
  const soulsTarget = Number(readString(formData, "souls_target") || "0");
  const fee = Number(readString(formData, "fee") || "0");

  const sectionFieldErrors: Record<string, string> = {};
  if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    sectionFieldErrors.club_type_id = t("validation.club_type_invalid");
  }
  if (!Number.isInteger(soulsTarget) || soulsTarget < 0) {
    sectionFieldErrors.souls_target = t("validation.souls_target_positive");
  }
  if (!Number.isInteger(fee) || fee < 0) {
    sectionFieldErrors.fee = t("validation.fee_positive");
  }
  if (Object.keys(sectionFieldErrors).length > 0) {
    return { fieldErrors: sectionFieldErrors };
  }

  const meetingDayRaw = readString(formData, "meeting_day");
  const meetingTimeRaw = readString(formData, "meeting_time").slice(0, 5) || "09:00";

  const payload: Parameters<typeof createClubSection>[1] = {
    club_type_id: clubTypeId,
  };

  const name = readString(formData, "name");
  if (name) payload.name = name;
  payload.souls_target = soulsTarget;
  payload.fee = fee;
  if (meetingDayRaw) payload.meeting_day = [{ day: meetingDayRaw }];
  payload.meeting_time = [{ time: meetingTimeRaw }];

  try {
    await createClubSection(clubId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_section_failed"), {
        endpointLabel: `/clubs/${clubId}/sections`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  return { success: t("success.section_created") };
}

export async function updateClubSectionAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const payload: Parameters<typeof updateClubSection>[2] = {};
  const name = readString(formData, "name");
  if (name) {
    payload.name = name;
  }

  const activeRaw = readString(formData, "active");
  if (activeRaw) {
    if (activeRaw !== "true" && activeRaw !== "false") {
      return { error: t("validation.section_status_invalid") };
    }
    payload.active = activeRaw === "true";
  }

  const clubTypeId = parseOptionalPositiveNumber(t, formData, "club_type_id");
  if (clubTypeId !== undefined) {
    payload.club_type_id = clubTypeId;
  }

  try {
    const soulsTarget = parseOptionalNonNegativeInteger(t, formData, "souls_target");
    if (soulsTarget !== undefined) {
      payload.souls_target = soulsTarget;
    }

    const fee = parseOptionalNonNegativeInteger(t, formData, "fee");
    if (fee !== undefined) {
      payload.fee = fee;
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.field_invalid", { field: "section" }),
    };
  }

  if (formData.has("meeting_day")) {
    const meetingDay = readString(formData, "meeting_day");
    payload.meeting_day = meetingDay ? [{ day: meetingDay }] : [];
  }

  if (formData.has("meeting_time")) {
    const meetingTime = readString(formData, "meeting_time").slice(0, 5);
    payload.meeting_time = meetingTime ? [{ time: meetingTime }] : [];
  }

  if (Object.keys(payload).length === 0) {
    return { error: t("validation.no_changes_section") };
  }

  try {
    await updateClubSection(clubId, sectionId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_section_failed"), {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.section_updated") };
}

export async function createClassCounselorAssignmentAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: t("validation.user_id_required") };
  }

  let classId = 0;
  try {
    classId = parseRequiredNumber(t, formData, "class_id", "Clase");
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : t("validation.field_invalid", { field: "class_id" }),
    };
  }

  const responsibilityType =
    parseResponsibilityType(readString(formData, "responsibility_type")) ??
    "primary";
  const exceptional = parseOptionalBooleanField(formData, "exceptional") ?? false;
  const exceptionReason = readString(formData, "exception_reason");
  const ecclesiasticalYearId = parseOptionalNumber(
    t,
    formData,
    "ecclesiastical_year_id",
  );
  const startDate = readString(formData, "start_date");
  const endDate = readString(formData, "end_date");

  const payload: Parameters<typeof createClassCounselorAssignment>[2] = {
    user_id: userId,
    class_id: classId,
    responsibility_type: responsibilityType,
    exceptional,
  };

  if (ecclesiasticalYearId !== undefined) {
    payload.ecclesiastical_year_id = ecclesiasticalYearId;
  }
  if (exceptionReason) payload.exception_reason = exceptionReason;
  if (startDate) payload.start_date = startDate;
  if (endDate) payload.end_date = endDate;

  try {
    await createClassCounselorAssignment(clubId, sectionId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(
        error,
        t("errors.create_class_assignment_failed"),
        {
          endpointLabel: `/clubs/${clubId}/sections/${sectionId}/class-counselor-assignments`,
        },
      ),
    };
  }

  revalidatePath(buildClubDetailPath(clubId));
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.class_assignment_created") };
}

export async function updateClassCounselorAssignmentAction(
  clubId: number,
  sectionId: number,
  assignmentId: string,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  if (!assignmentId) {
    return { error: t("validation.assignment_not_identified") };
  }

  const responsibilityType = parseResponsibilityType(
    readString(formData, "responsibility_type"),
  );
  const exceptional = parseOptionalBooleanField(formData, "exceptional");
  const exceptionReason = readString(formData, "exception_reason");
  const startDate = readString(formData, "start_date");
  const endDate = readString(formData, "end_date");

  const payload: Parameters<typeof updateClassCounselorAssignment>[1] = {};
  if (responsibilityType) payload.responsibility_type = responsibilityType;
  if (exceptional !== undefined) payload.exceptional = exceptional;
  if (exceptionReason) payload.exception_reason = exceptionReason;
  if (startDate) payload.start_date = startDate;
  if (endDate) payload.end_date = endDate;

  if (Object.keys(payload).length === 0) {
    return { error: t("validation.no_changes") };
  }

  try {
    await updateClassCounselorAssignment(assignmentId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(
        error,
        t("errors.update_class_assignment_failed"),
        {
          endpointLabel: `/class-counselor-assignments/${assignmentId}`,
        },
      ),
    };
  }

  revalidatePath(buildClubDetailPath(clubId));
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.class_assignment_updated") };
}

export async function revokeClassCounselorAssignmentAction(
  clubId: number,
  sectionId: number,
  assignmentId: string,
  _: ClubActionState,
  _formData: FormData,
): Promise<ClubActionState> {
  void _;
  void _formData;

  await requireAdminUser();
  const t = await getTranslations("clubs");

  if (!assignmentId) {
    return { error: t("validation.assignment_remove_not_identified") };
  }

  try {
    await revokeClassCounselorAssignment(assignmentId);
  } catch (error) {
    return {
      error: getActionErrorMessage(
        error,
        t("errors.revoke_class_assignment_failed"),
        {
          endpointLabel: `/class-counselor-assignments/${assignmentId}`,
        },
      ),
    };
  }

  revalidatePath(buildClubDetailPath(clubId));
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.class_assignment_revoked") };
}

export async function addClubSectionMemberAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: t("validation.user_id_required") };
  }

  const roleId = readString(formData, "role_id");
  if (!roleId) {
    return { error: t("validation.role_required") };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(
      t,
      formData,
      "ecclesiastical_year_id",
      t("fields.ecclesiastical_year"),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.ecclesiastical_year_invalid"),
    };
  }

  const startDate = readString(formData, "start_date") || new Date().toISOString();
  const endDate = readString(formData, "end_date") || undefined;

  try {
    await createClubRoleAssignment(clubId, sectionId, {
      user_id: userId,
      role_id: roleId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      start_date: startDate,
      ...(endDate ? { end_date: endDate } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_role_assignment_failed"), {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}/roles`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.assignment_created") };
}

export async function updateClubSectionMemberRoleAction(
  clubId: number,
  sectionId: number,
  userId: string,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  if (!userId) {
    return { error: t("validation.member_not_identified") };
  }

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) {
    return { error: t("validation.assignment_not_identified") };
  }

  const roleId = readString(formData, "role_id");
  if (!roleId) {
    return { error: t("validation.role_required") };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(
      t,
      formData,
      "ecclesiastical_year_id",
      t("fields.ecclesiastical_year"),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.ecclesiastical_year_invalid"),
    };
  }

  const startDate = readString(formData, "start_date") || new Date().toISOString();

  try {
    await updateClubRoleAssignment(assignmentId, {
      role_id: roleId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      start_date: startDate,
      status: "active",
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_role_failed"), {
        endpointLabel: `/club-roles/${assignmentId}`,
      }),
    };
  }

  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.role_updated") };
}

export async function removeClubSectionMemberAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) {
    return { error: t("validation.assignment_remove_not_identified") };
  }

  try {
    await revokeClubRoleAssignment(assignmentId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.remove_assignment_failed"), {
        endpointLabel: `/club-roles/${assignmentId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: t("success.assignment_removed") };
}

export async function succeedClubSectionDirectorAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const currentUser = await requireAdminUser();

  if (!canUseDirectorSuccession(extractRoles(currentUser))) {
    return {
      error:
        "Solo admin, super-admin, director-lf y assistant-lf pueden ejecutar la sucesión anual de director.",
    };
  }

  const t = await getTranslations("clubs");
  const currentAssignmentId = readString(formData, "current_assignment_id");
  if (!currentAssignmentId) {
    return { error: "No se pudo identificar al director actual." };
  }

  const successorUserId = readString(formData, "successor_user_id");
  if (!successorUserId) {
    return { error: t("validation.user_id_required") };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(
      t,
      formData,
      "ecclesiastical_year_id",
      t("fields.ecclesiastical_year"),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.ecclesiastical_year_invalid"),
    };
  }

  const startDate = readString(formData, "start_date") || undefined;

  try {
    await succeedClubSectionDirector(clubId, sectionId, {
      current_assignment_id: currentAssignmentId,
      successor_user_id: successorUserId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      ...(startDate ? { start_date: startDate } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo cambiar el director de la sección", {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}/director-succession`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Director actualizado correctamente" };
}

export async function assignInitialClubSectionDirectorAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const currentUser = await requireAdminUser();

  if (!canUseDirectorSuccession(extractRoles(currentUser))) {
    return {
      error:
        "Solo admin, super-admin, director-lf y assistant-lf pueden asignar el director inicial.",
    };
  }

  const t = await getTranslations("clubs");
  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: t("validation.user_id_required") };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(
      t,
      formData,
      "ecclesiastical_year_id",
      t("fields.ecclesiastical_year"),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.ecclesiastical_year_invalid"),
    };
  }

  const startDate = readString(formData, "start_date") || undefined;

  try {
    await assignInitialClubSectionDirector(clubId, sectionId, {
      user_id: userId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      ...(startDate ? { start_date: startDate } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo asignar el director inicial", {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}/director-assignment`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Director asignado correctamente" };
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

export type BulkClubRow = {
  rowNumber: number;
  name: string;
  local_field_id: number;
  district_id: number;
  church_id: number;
  description?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

export type BulkClubRowResult = {
  rowNumber: number;
  name: string;
  ok: boolean;
  message?: string;
  clubId?: number;
};

export type BulkClubsImportResult = {
  results: BulkClubRowResult[];
  created: number;
  failed: number;
  forbidden?: boolean;
};

export async function bulkCreateClubsAction(
  rows: BulkClubRow[],
): Promise<BulkClubsImportResult> {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs");

  if (!canManageClubsByRole(user)) {
    return {
      results: [],
      created: 0,
      failed: 0,
      forbidden: true,
    };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { results: [], created: 0, failed: 0 };
  }

  const allowedLocalFields = await listLocalFieldsForTerritory(user);
  const allowedLocalFieldIds = new Set(allowedLocalFields.map((field) => field.local_field_id));

  const results: BulkClubRowResult[] = [];
  let created = 0;
  let failed = 0;

  for (const row of rows) {
    if (
      !row.name ||
      !Number.isFinite(row.local_field_id) ||
      !Number.isFinite(row.district_id) ||
      !Number.isFinite(row.church_id)
    ) {
      failed++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name ?? "",
        ok: false,
        message: t("validation.bulk_row_invalid"),
      });
      continue;
    }

    try {
      if (allowedLocalFieldIds.size > 0 && !allowedLocalFieldIds.has(row.local_field_id)) {
        throw new Error("El campo local seleccionado está fuera de tu alcance.");
      }

      const payload = {
        name: row.name,
        description: row.description,
        local_field_id: row.local_field_id,
        districlub_type_id: row.district_id,
        church_id: row.church_id,
        address: row.address,
        coordinates: row.coordinates,
      };
      const createdPayload = await createClub(payload);
      const clubId = normalizeCreatedClubId(createdPayload) ?? undefined;
      created++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        ok: true,
        clubId,
      });
    } catch (error) {
      failed++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        ok: false,
        message: getActionErrorMessage(error, t("errors.create_club_failed"), {
          endpointLabel: "/clubs",
        }),
      });
    }
  }

  if (created > 0) {
    revalidatePath("/dashboard/clubs");
  }

  return { results, created, failed };
}
