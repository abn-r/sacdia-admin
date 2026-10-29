"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminClubType,
  deleteAdminClubType,
  updateAdminClubType,
} from "@/lib/api/admin-club-types";
import { clubTypeFormSchema } from "@/lib/catalogs/club-types/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/club-types";

export type ClubTypeActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

async function parseFormData(formData: FormData) {
  const parsed = clubTypeFormSchema.safeParse({
    name: readString(formData, "name"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createClubTypeAction(
  _prev: ClubTypeActionState,
  formData: FormData,
): Promise<ClubTypeActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-types", "create")) {
      return { error: await catalogActionText("club-types", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
    await createAdminClubType(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-types", "createFailed"), {
        endpointLabel: "POST /admin/club-types",
      }),
    };
  }
}

export async function updateClubTypeAction(
  _prev: ClubTypeActionState,
  formData: FormData,
): Promise<ClubTypeActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-types", "update")) {
      return { error: await catalogActionText("club-types", "noPermissionUpdate") };
    }

    const clubTypeId = Number(readString(formData, "club_type_id"));
    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      return { error: await catalogActionText("club-types", "invalidId") };
    }

    const values = await parseFormData(formData);
    await updateAdminClubType(clubTypeId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-types", "updateFailed"), {
        endpointLabel: "PATCH /admin/club-types/:id",
      }),
    };
  }
}

export async function deleteClubTypeAction(clubTypeId: number): Promise<ClubTypeActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-types", "delete")) {
      return { error: await catalogActionText("club-types", "noPermissionDelete") };
    }

    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      return { error: await catalogActionText("club-types", "invalidId") };
    }

    await deleteAdminClubType(clubTypeId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-types", "deleteFailed"), {
        endpointLabel: "DELETE /admin/club-types/:id",
      }),
    };
  }
}
