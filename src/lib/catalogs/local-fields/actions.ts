"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminLocalField,
  deleteAdminLocalField,
  updateAdminLocalField,
} from "@/lib/api/admin-local-fields";
import { localFieldFormSchema } from "@/lib/catalogs/local-fields/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/local-fields";

export type LocalFieldActionState = {
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
  const parsed = localFieldFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    union_id: readPositiveInt(formData, "union_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    timezone: readString(formData, "timezone") || null,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createLocalFieldAction(
  _prev: LocalFieldActionState,
  formData: FormData,
): Promise<LocalFieldActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-local-fields", "create")) {
      return { error: await catalogActionText("local-fields", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
    await createAdminLocalField(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("local-fields", "createFailed"), {
        endpointLabel: "POST /admin/local-fields",
      }),
    };
  }
}

export async function updateLocalFieldAction(
  _prev: LocalFieldActionState,
  formData: FormData,
): Promise<LocalFieldActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-local-fields", "update")) {
      return { error: await catalogActionText("local-fields", "noPermissionUpdate") };
    }

    const localFieldId = readPositiveInt(formData, "local_field_id");
    if (!localFieldId) {
      return { error: await catalogActionText("local-fields", "invalidId") };
    }

    const values = await parseFormData(formData);
    await updateAdminLocalField(localFieldId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("local-fields", "updateFailed"), {
        endpointLabel: "PATCH /admin/local-fields/:id",
      }),
    };
  }
}

export async function deleteLocalFieldAction(
  localFieldId: number,
): Promise<LocalFieldActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-local-fields", "delete")) {
      return { error: await catalogActionText("local-fields", "noPermissionDelete") };
    }

    if (!Number.isFinite(localFieldId) || localFieldId <= 0) {
      return { error: await catalogActionText("local-fields", "invalidId") };
    }

    await deleteAdminLocalField(localFieldId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("local-fields", "deleteFailed"), {
        endpointLabel: "DELETE /admin/local-fields/:id",
      }),
    };
  }
}
