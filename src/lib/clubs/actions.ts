"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createClub,
  createClubSection,
  createClubRoleAssignment,
  deleteClub,
  listClubSections,
  revokeClubRoleAssignment,
  updateClub,
  updateClubSection,
  updateClubRoleAssignment,
  type ClubSection,
} from "@/lib/api/clubs";
import { unwrapList, unwrapObject } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";

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
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function buildClubSectionPath(clubId: number, sectionId: number) {
  return `/dashboard/clubs/${clubId}/sections/${sectionId}`;
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
    district_id: parseRequiredNumber(
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
  await requireAdminUser();
  const t = await getTranslations("clubs");

  try {
    const payload = buildCreatePayload(t, formData);
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
  await requireAdminUser();
  const t = await getTranslations("clubs");

  let clubId: number | null = null;

  try {
    const payload = buildCreatePayload(t, formData);
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

  // Parse sections from form — form fields: section_club_type_id_0, section_name_0, etc.
  const sectionResults: ClubSectionSyncResult[] = [];
  let idx = 0;
  while (formData.has(`section_club_type_id_${idx}`)) {
    const clubTypeId = Number(readString(formData, `section_club_type_id_${idx}`));
    const sectionName = readString(formData, `section_name_${idx}`);

    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      idx++;
      continue;
    }

    try {
      const result = await createClubSection(clubId, {
        club_type_id: clubTypeId,
        name: sectionName || undefined,
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
    idx++;
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

export async function updateClubAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();
  const t = await getTranslations("clubs");

  try {
    const payload = buildUpdatePayload(t, formData);
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
  if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    return { error: t("validation.club_type_invalid") };
  }

  const soulsTarget = Number(readString(formData, "souls_target") || "0");
  if (!Number.isFinite(soulsTarget) || soulsTarget < 0) {
    return { error: t("validation.souls_target_positive") };
  }

  const fee = Number(readString(formData, "fee") || "0");
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: t("validation.fee_positive") };
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

  const payload: { name?: string; active?: boolean; club_type_id?: number } = {};
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
