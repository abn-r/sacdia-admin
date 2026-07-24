"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminClubType,
  deleteAdminClubType,
  updateAdminClubType,
} from "@/lib/api/admin-club-types";
import { clubTypeFormSchema } from "@/lib/catalogs/club-types/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CLUB_TYPES_CREATE,
  CLUB_TYPES_DELETE,
  CLUB_TYPES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/club-types";

export type ClubTypeActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseFormData(formData: FormData) {
  const parsed = clubTypeFormSchema.safeParse({
    name: readString(formData, "name"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createClubTypeAction(
  _prev: ClubTypeActionState,
  formData: FormData,
): Promise<ClubTypeActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CLUB_TYPES_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear tipos de club." };
    }

    const values = parseFormData(formData);
    await createAdminClubType(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el tipo de club.", {
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
    if (!hasAnyPermission(user, [CLUB_TYPES_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar tipos de club." };
    }

    const clubTypeId = Number(readString(formData, "club_type_id"));
    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      return { error: "Identificador de tipo de club inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminClubType(clubTypeId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el tipo de club.", {
        endpointLabel: "PATCH /admin/club-types/:id",
      }),
    };
  }
}

export async function deleteClubTypeAction(clubTypeId: number): Promise<ClubTypeActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CLUB_TYPES_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar tipos de club." };
    }

    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      return { error: "Identificador de tipo de club inválido." };
    }

    await deleteAdminClubType(clubTypeId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el tipo de club.", {
        endpointLabel: "DELETE /admin/club-types/:id",
      }),
    };
  }
}
