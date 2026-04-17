"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { apiRequest } from "@/lib/api/client";
import type { CreateUnitPayload, UpdateUnitPayload } from "@/lib/api/units";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitActionState = {
  error?: string;
  success?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(formData: FormData, field: string, label: string): string {
  const value = readString(formData, field);
  if (!value) throw new Error(`${label} es obligatorio — selecciona un miembro`);
  if (!uuidPattern.test(value)) throw new Error(`${label}: selecciona un miembro valido`);
  return value;
}

function optionalUuid(
  formData: FormData,
  field: string,
  label: string,
): string | undefined {
  const value = readString(formData, field);
  if (!value) return undefined;
  if (!uuidPattern.test(value)) throw new Error(`${label}: selecciona un miembro valido`);
  return value;
}

function buildPayload(formData: FormData): CreateUnitPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio");

  const clubTypeId = Number(readString(formData, "club_type_id"));
  if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    throw new Error("El tipo de club es obligatorio");
  }

  const captain_id = requireUuid(formData, "captain_id", "Capitán");
  const secretary_id = requireUuid(formData, "secretary_id", "Secretario");
  const advisor_id = requireUuid(formData, "advisor_id", "Consejero");
  const substitute_advisor_id = optionalUuid(
    formData,
    "substitute_advisor_id",
    "Consejero suplente",
  );

  return {
    name,
    club_type_id: clubTypeId,
    captain_id,
    secretary_id,
    advisor_id,
    substitute_advisor_id,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUnitAction(
  clubId: number,
  _: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  await requireAdminUser();

  try {
    const payload = buildPayload(formData);
    await apiRequest<unknown>(`/clubs/${clubId}/units`, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la unidad", {
        endpointLabel: `/clubs/${clubId}/units`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect(`/dashboard/clubs/${clubId}?tab=units`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUnitAction(
  clubId: number,
  unitId: number,
  _: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  await requireAdminUser();

  try {
    const payload: UpdateUnitPayload = buildPayload(formData);
    await apiRequest<unknown>(`/clubs/${clubId}/units/${unitId}`, {
      method: "PATCH",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la unidad", {
        endpointLabel: `/clubs/${clubId}/units/${unitId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect(`/dashboard/clubs/${clubId}?tab=units`);
}
