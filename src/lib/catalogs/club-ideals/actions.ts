"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminClubIdeal,
  deleteAdminClubIdeal,
  updateAdminClubIdeal,
} from "@/lib/api/admin-club-ideals";
import { clubIdealFormSchema } from "@/lib/catalogs/club-ideals/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/club-ideals";

export type ClubIdealActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

async function parseCreateFormData(formData: FormData) {
  const parsed = clubIdealFormSchema.safeParse({
    name: readString(formData, "name"),
    ideal: readString(formData, "ideal") || undefined,
    ideal_order: readString(formData, "ideal_order") || "1",
    club_type_id: readString(formData, "club_type_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

async function parseUpdateFormData(formData: FormData) {
  const parsed = clubIdealFormSchema
    .omit({ club_type_id: true })
    .safeParse({
      name: readString(formData, "name"),
      ideal: readString(formData, "ideal") || undefined,
      ideal_order: readString(formData, "ideal_order") || "1",
      active: formData.get("active") === "on" || formData.get("active") === "true",
    });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createClubIdealAction(
  _prev: ClubIdealActionState,
  formData: FormData,
): Promise<ClubIdealActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-ideals", "create")) {
      return { error: await catalogActionText("club-ideals", "noPermissionCreate") };
    }

    const values = await parseCreateFormData(formData);
    await createAdminClubIdeal(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-ideals", "createFailed"), {
        endpointLabel: "POST /admin/club-ideals",
      }),
    };
  }
}

export async function updateClubIdealAction(
  _prev: ClubIdealActionState,
  formData: FormData,
): Promise<ClubIdealActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-ideals", "update")) {
      return { error: await catalogActionText("club-ideals", "noPermissionUpdate") };
    }

    const clubIdealId = Number(readString(formData, "club_ideal_id"));
    if (!Number.isFinite(clubIdealId) || clubIdealId <= 0) {
      return { error: await catalogActionText("club-ideals", "invalidId") };
    }

    const values = await parseUpdateFormData(formData);
    await updateAdminClubIdeal(clubIdealId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-ideals", "updateFailed"), {
        endpointLabel: "PATCH /admin/club-ideals/:id",
      }),
    };
  }
}

export async function deleteClubIdealAction(clubIdealId: number): Promise<ClubIdealActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-club-ideals", "delete")) {
      return { error: await catalogActionText("club-ideals", "noPermissionDelete") };
    }

    if (!Number.isFinite(clubIdealId) || clubIdealId <= 0) {
      return { error: await catalogActionText("club-ideals", "invalidId") };
    }

    await deleteAdminClubIdeal(clubIdealId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("club-ideals", "deleteFailed"), {
        endpointLabel: "DELETE /admin/club-ideals/:id",
      }),
    };
  }
}
