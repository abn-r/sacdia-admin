"use server";

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

function parseFormData(formData: FormData) {
  const parsed = localFieldFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    union_id: readPositiveInt(formData, "union_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
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
      return { error: "No tienes permisos para crear campos locales." };
    }

    const values = parseFormData(formData);
    await createAdminLocalField(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el campo local.", {
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
      return { error: "No tienes permisos para editar campos locales." };
    }

    const localFieldId = readPositiveInt(formData, "local_field_id");
    if (!localFieldId) {
      return { error: "Identificador de campo local inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminLocalField(localFieldId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el campo local.", {
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
      return { error: "No tienes permisos para eliminar campos locales." };
    }

    if (!Number.isFinite(localFieldId) || localFieldId <= 0) {
      return { error: "Identificador de campo local inválido." };
    }

    await deleteAdminLocalField(localFieldId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el campo local.", {
        endpointLabel: "DELETE /admin/local-fields/:id",
      }),
    };
  }
}
