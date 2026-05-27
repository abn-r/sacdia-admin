"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { apiRequest } from "@/lib/api/client";
import type { UpdateUnitPayload } from "@/lib/api/units";
import { requireAdminUser } from "@/lib/auth/session";
import {
  buildUnitPayloadFromFormData,
  collectUnitFieldErrors,
} from "@/lib/units/form-payload";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unitsT(t: Awaited<ReturnType<typeof getTranslations<"units">>>) {
  return (key: string, values?: Record<string, string>) =>
    t(key as never, values as never);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUnitAction(
  clubId: number,
  _: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  await requireAdminUser();
  const t = await getTranslations("units");
  const tx = unitsT(t);

  const fieldErrors = collectUnitFieldErrors(tx, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload = buildUnitPayloadFromFormData(tx, formData);
    await apiRequest<unknown>(`/clubs/${clubId}/units`, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
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
  const t = await getTranslations("units");
  const tx = unitsT(t);

  const fieldErrors = collectUnitFieldErrors(tx, formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const payload: UpdateUnitPayload = buildUnitPayloadFromFormData(
      tx,
      formData,
    );
    await apiRequest<unknown>(`/clubs/${clubId}/units/${unitId}`, {
      method: "PATCH",
      body: payload,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/clubs/${clubId}/units/${unitId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect(`/dashboard/clubs/${clubId}?tab=units`);
}
