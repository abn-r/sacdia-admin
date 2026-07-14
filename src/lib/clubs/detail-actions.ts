"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createClassCounselorAssignment,
  createClubRoleAssignment,
  createClubSection,
  revokeClassCounselorAssignment,
  revokeClubRoleAssignment,
  type ClassCounselorResponsibilityType,
} from "@/lib/api/clubs";
import { requireAdminUser } from "@/lib/auth/session";

export type DetailActionState = {
  ok?: boolean;
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function buildClubPath(clubId: number, tab?: string) {
  const base = `/dashboard/clubs/${clubId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

export async function assignClubRoleAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const t = await getTranslations("clubs.detail.actions");
  try {
    await requireAdminUser();
    const clubId = Number(readString(formData, "club_id"));
    const sectionId = Number(readString(formData, "section_id"));
    const userId = readString(formData, "user_id");
    const roleId = readString(formData, "role_id");
    const yearId = Number(readString(formData, "ecclesiastical_year_id"));
    const startDate = readString(formData, "start_date") || new Date().toISOString().slice(0, 10);

    if (!clubId || !sectionId || !userId || !roleId || !yearId) {
      return { error: t("missingFields") };
    }

    await createClubRoleAssignment(clubId, sectionId, {
      user_id: userId,
      role_id: roleId,
      ecclesiastical_year_id: yearId,
      start_date: startDate,
    });

    revalidatePath(buildClubPath(clubId, "roles"));
    return { ok: true, success: t("roleAssigned") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("roleAssignFailed")) };
  }
}

export async function revokeClubRoleAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const t = await getTranslations("clubs.detail.actions");
  try {
    await requireAdminUser();
    const clubId = Number(readString(formData, "club_id"));
    const assignmentId = readString(formData, "assignment_id");
    if (!assignmentId) return { error: t("missingFields") };

    await revokeClubRoleAssignment(assignmentId);
    revalidatePath(buildClubPath(clubId, "roles"));
    return { ok: true, success: t("roleRevoked") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("roleRevokeFailed")) };
  }
}

export async function assignClassCounselorAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const t = await getTranslations("clubs.detail.actions");
  try {
    await requireAdminUser();
    const clubId = Number(readString(formData, "club_id"));
    const sectionId = Number(readString(formData, "section_id"));
    const userId = readString(formData, "user_id");
    const classId = Number(readString(formData, "class_id"));
    const yearId = Number(readString(formData, "ecclesiastical_year_id"));
    const responsibility = readString(formData, "responsibility_type") as ClassCounselorResponsibilityType;

    if (!clubId || !sectionId || !userId || !classId) {
      return { error: t("missingFields") };
    }

    await createClassCounselorAssignment(clubId, sectionId, {
      user_id: userId,
      class_id: classId,
      ecclesiastical_year_id: yearId || undefined,
      responsibility_type: responsibility || "primary",
    });

    revalidatePath(buildClubPath(clubId, "roles"));
    return { ok: true, success: t("counselorAssigned") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("counselorAssignFailed")) };
  }
}

export async function createClubSectionAction(
  clubId: number,
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const t = await getTranslations("clubs.detail.actions");
  try {
    await requireAdminUser();

    const clubTypeId = Number(readString(formData, "club_type_id"));
    const soulsTarget = Number(readString(formData, "souls_target") || "0");
    const fee = Number(readString(formData, "fee") || "0");
    const name = readString(formData, "name");

    const fieldErrors: Record<string, string> = {};
    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      fieldErrors.club_type_id = t("invalidClubType");
    }
    if (!Number.isInteger(soulsTarget) || soulsTarget < 0) {
      fieldErrors.souls_target = t("invalidSoulsTarget");
    }
    if (!Number.isInteger(fee) || fee < 0) {
      fieldErrors.fee = t("invalidFee");
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors };
    }

    await createClubSection(clubId, {
      club_type_id: clubTypeId,
      name: name || undefined,
      souls_target: soulsTarget,
      fee,
    });

    revalidatePath(buildClubPath(clubId, "sections"));
    revalidatePath(buildClubPath(clubId, "general"));
    return { ok: true, success: t("sectionCreated") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("sectionCreateFailed")) };
  }
}

export async function revokeClassCounselorAction(
  _prev: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const t = await getTranslations("clubs.detail.actions");
  try {
    await requireAdminUser();
    const clubId = Number(readString(formData, "club_id"));
    const assignmentId = readString(formData, "assignment_id");
    if (!assignmentId) return { error: t("missingFields") };

    await revokeClassCounselorAssignment(assignmentId);
    revalidatePath(buildClubPath(clubId, "roles"));
    return { ok: true, success: t("counselorRevoked") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("counselorRevokeFailed")) };
  }
}
