"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminUnion,
  deleteAdminUnion,
  updateAdminUnion,
} from "@/lib/api/admin-unions";
import { unionFormSchema } from "@/lib/catalogs/unions/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  UNIONS_CREATE,
  UNIONS_DELETE,
  UNIONS_UPDATE,
} from "@/lib/auth/permissions";
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

function parseFormData(formData: FormData) {
  const parsed = unionFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    country_id: readPositiveInt(formData, "country_id"),
    division_id: readPositiveInt(formData, "division_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createUnionAction(
  _prev: UnionActionState,
  formData: FormData,
): Promise<UnionActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [UNIONS_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear uniones." };
    }

    const values = parseFormData(formData);
    await createAdminUnion(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la unión.", {
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
    if (!hasAnyPermission(user, [UNIONS_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar uniones." };
    }

    const unionId = readPositiveInt(formData, "union_id");
    if (!unionId) {
      return { error: "Identificador de unión inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminUnion(unionId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la unión.", {
        endpointLabel: "PATCH /admin/unions/:id",
      }),
    };
  }
}

export async function deleteUnionAction(unionId: number): Promise<UnionActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [UNIONS_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar uniones." };
    }

    if (!Number.isFinite(unionId) || unionId <= 0) {
      return { error: "Identificador de unión inválido." };
    }

    await deleteAdminUnion(unionId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la unión.", {
        endpointLabel: "DELETE /admin/unions/:id",
      }),
    };
  }
}
