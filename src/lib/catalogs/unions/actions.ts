"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminUnion,
  deleteAdminUnion,
  updateAdminUnion,
} from "@/lib/api/admin-unions";
import { unionFormSchema } from "@/lib/catalogs/unions/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/unions";

export type UnionActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function readPositiveInt(formData: FormData, field: string) {
  const value = Number(readString(formData, field));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

async function parseFormData(formData: FormData) {
  const parsed = unionFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    country_id: readPositiveInt(formData, "country_id"),
    division_id: readPositiveInt(formData, "division_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createUnionAction(
  _prev: UnionActionState,
  formData: FormData,
): Promise<UnionActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-unions", "create")) {
      return { error: await catalogActionText("unions", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
    await createAdminUnion(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("unions", "createFailed"), {
        endpointLabel: "POST /admin/unions",
      }),
    };
  }
}

export async function updateUnionAction(
  _prev: UnionActionState,
  formData: FormData,
): Promise<UnionActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-unions", "update")) {
      return { error: await catalogActionText("unions", "noPermissionUpdate") };
    }

    const unionId = readPositiveInt(formData, "union_id");
    if (!unionId) {
      return { error: await catalogActionText("unions", "invalidId") };
    }

    const values = await parseFormData(formData);
    await updateAdminUnion(unionId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("unions", "updateFailed"), {
        endpointLabel: "PATCH /admin/unions/:id",
      }),
    };
  }
}

export async function deleteUnionAction(unionId: number): Promise<UnionActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-unions", "delete")) {
      return { error: await catalogActionText("unions", "noPermissionDelete") };
    }

    if (!Number.isFinite(unionId) || unionId <= 0) {
      return { error: await catalogActionText("unions", "invalidId") };
    }

    await deleteAdminUnion(unionId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("unions", "deleteFailed"), {
        endpointLabel: "DELETE /admin/unions/:id",
      }),
    };
  }
}
