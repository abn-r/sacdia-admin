"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_UPDATE,
} from "@/lib/auth/permissions";
import {
  addCamporeeStaffMember,
  deleteCamporeeStaffMember,
  updateCamporeeStaffMember,
  type CamporeeStaffCategory,
  type CamporeeStaffScope,
} from "@/lib/api/camporee-staff";

export type CamporeeStaffActionState = {
  error?: string;
  success?: string;
};

const STAFF_CATEGORIES = new Set<CamporeeStaffCategory>([
  "judge",
  "administrative",
  "kitchen",
  "support",
  "spiritual",
  "leadership",
  "other",
]);

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readPositiveNumber(formData: FormData, key: string): number | null {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function readScope(formData: FormData): CamporeeStaffScope {
  return readBoolean(formData, "is_union") ? "union" : "local";
}

function getCamporeePath(camporeeId: number | null, scope: CamporeeStaffScope) {
  if (!camporeeId) return "/dashboard/camporees";
  return scope === "union"
    ? `/dashboard/camporees/union/${camporeeId}`
    : `/dashboard/camporees/${camporeeId}`;
}

async function assertCanManageCamporeeStaff() {
  const user = await requireAdminUser();
  return hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE])
    ? null
    : "Sin permisos para gestionar el personal del camporee.";
}

export async function addCamporeeStaffMemberAction(
  _: CamporeeStaffActionState,
  formData: FormData,
): Promise<CamporeeStaffActionState> {
  const permissionError = await assertCanManageCamporeeStaff();
  if (permissionError) return { error: permissionError };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };

  const userId = readString(formData, "user_id");
  if (!userId) return { error: "La persona es obligatoria." };

  const category = readString(formData, "category") as CamporeeStaffCategory;
  if (!STAFF_CATEGORIES.has(category)) {
    return { error: "La categoría del personal es inválida." };
  }

  const scope = readScope(formData);
  const roleLabel = readString(formData, "role_label");
  const notes = readString(formData, "notes");

  try {
    await addCamporeeStaffMember(scope, camporeeId, {
      user_id: userId,
      category,
      role_label: roleLabel || null,
      notes: notes || null,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo agregar personal al camporee.", {
        endpointLabel:
          scope === "union"
            ? `/union-camporees/${camporeeId}/staff`
            : `/local-camporees/${camporeeId}/staff`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, scope));
  return { success: "Personal agregado." };
}

export async function updateCamporeeStaffMemberAction(
  _: CamporeeStaffActionState,
  formData: FormData,
): Promise<CamporeeStaffActionState> {
  const permissionError = await assertCanManageCamporeeStaff();
  if (permissionError) return { error: permissionError };

  const staffMemberId = readString(formData, "staff_member_id");
  if (!staffMemberId) return { error: "No se pudo identificar el registro de personal." };

  const category = readString(formData, "category") as CamporeeStaffCategory;
  if (category && !STAFF_CATEGORIES.has(category)) {
    return { error: "La categoría del personal es inválida." };
  }

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const scope = readScope(formData);
  const roleLabel = readString(formData, "role_label");
  const notes = readString(formData, "notes");

  try {
    await updateCamporeeStaffMember(staffMemberId, {
      ...(category ? { category } : {}),
      role_label: roleLabel || null,
      notes: notes || null,
      ...(formData.has("active") ? { active: readBoolean(formData, "active") } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el personal.", {
        endpointLabel: `/camporee-staff/${staffMemberId}`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, scope));
  return { success: "Personal actualizado." };
}

export async function deleteCamporeeStaffMemberAction(
  _: CamporeeStaffActionState,
  formData: FormData,
): Promise<CamporeeStaffActionState> {
  const permissionError = await assertCanManageCamporeeStaff();
  if (permissionError) return { error: permissionError };

  const staffMemberId = readString(formData, "staff_member_id");
  if (!staffMemberId) return { error: "No se pudo identificar el registro de personal." };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const scope = readScope(formData);

  try {
    await deleteCamporeeStaffMember(staffMemberId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo desactivar el personal.", {
        endpointLabel: `/camporee-staff/${staffMemberId}`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, scope));
  return { success: "Personal desactivado." };
}
