"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminClubIdeal,
  deleteAdminClubIdeal,
  updateAdminClubIdeal,
} from "@/lib/api/admin-club-ideals";
import { clubIdealFormSchema } from "@/lib/catalogs/club-ideals/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CLUB_IDEALS_CREATE,
  CLUB_IDEALS_DELETE,
  CLUB_IDEALS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/club-ideals";

export type ClubIdealActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseCreateFormData(formData: FormData) {
  const parsed = clubIdealFormSchema.safeParse({
    name: readString(formData, "name"),
    ideal: readString(formData, "ideal") || undefined,
    ideal_order: readString(formData, "ideal_order") || "1",
    club_type_id: readString(formData, "club_type_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

function parseUpdateFormData(formData: FormData) {
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
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createClubIdealAction(
  _prev: ClubIdealActionState,
  formData: FormData,
): Promise<ClubIdealActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CLUB_IDEALS_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear ideales de club." };
    }

    const values = parseCreateFormData(formData);
    await createAdminClubIdeal(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el ideal de club.", {
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
    if (!hasAnyPermission(user, [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar ideales de club." };
    }

    const clubIdealId = Number(readString(formData, "club_ideal_id"));
    if (!Number.isFinite(clubIdealId) || clubIdealId <= 0) {
      return { error: "Identificador de ideal inválido." };
    }

    const values = parseUpdateFormData(formData);
    await updateAdminClubIdeal(clubIdealId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el ideal de club.", {
        endpointLabel: "PATCH /admin/club-ideals/:id",
      }),
    };
  }
}

export async function deleteClubIdealAction(clubIdealId: number): Promise<ClubIdealActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CLUB_IDEALS_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar ideales de club." };
    }

    if (!Number.isFinite(clubIdealId) || clubIdealId <= 0) {
      return { error: "Identificador de ideal inválido." };
    }

    await deleteAdminClubIdeal(clubIdealId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el ideal de club.", {
        endpointLabel: "DELETE /admin/club-ideals/:id",
      }),
    };
  }
}
