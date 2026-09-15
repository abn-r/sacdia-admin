"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminDistrict,
  deleteAdminDistrict,
  updateAdminDistrict,
} from "@/lib/api/admin-districts";
import { districtFormSchema } from "@/lib/catalogs/districts/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/districts";

export type DistrictActionState = {
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
  const parsed = districtFormSchema.safeParse({
    name: readString(formData, "name"),
    local_field_id: readPositiveInt(formData, "local_field_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createDistrictAction(
  _prev: DistrictActionState,
  formData: FormData,
): Promise<DistrictActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-districts", "create")) {
      return { error: "No tienes permisos para crear distritos." };
    }

    const values = parseFormData(formData);
    await createAdminDistrict(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el distrito.", {
        endpointLabel: "POST /admin/districts",
      }),
    };
  }
}

export async function updateDistrictAction(
  _prev: DistrictActionState,
  formData: FormData,
): Promise<DistrictActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-districts", "update")) {
      return { error: "No tienes permisos para editar distritos." };
    }

    const districtId = readPositiveInt(formData, "district_id");
    if (!districtId) {
      return { error: "Identificador de distrito inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminDistrict(districtId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el distrito.", {
        endpointLabel: "PATCH /admin/districts/:id",
      }),
    };
  }
}

export async function deleteDistrictAction(districtId: number): Promise<DistrictActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-districts", "delete")) {
      return { error: "No tienes permisos para eliminar distritos." };
    }

    if (!Number.isFinite(districtId) || districtId <= 0) {
      return { error: "Identificador de distrito inválido." };
    }

    await deleteAdminDistrict(districtId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el distrito.", {
        endpointLabel: "DELETE /admin/districts/:id",
      }),
    };
  }
}
