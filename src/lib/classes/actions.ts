"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  expireOverdueClassEnrollments,
  type ExpireOverdueClassEnrollmentsResult,
} from "@/lib/api/classes";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CLASSES_MANAGE } from "@/lib/auth/permissions";

export type ClassExpirationActionState = {
  error?: string;
  result?: ExpireOverdueClassEnrollmentsResult;
};

function readOptionalPositiveInt(formData: FormData, field: string): number | undefined {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export async function expireOverdueClassEnrollmentsAction(
  _: ClassExpirationActionState,
  formData: FormData,
): Promise<ClassExpirationActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CLASSES_MANAGE])) {
    return { error: "Sin permisos para vencer inscripciones." };
  }

  try {
    const ecclesiasticalYearId = readOptionalPositiveInt(formData, "ecclesiastical_year_id");
    const response = await expireOverdueClassEnrollments({
      ...(ecclesiasticalYearId ? { ecclesiastical_year_id: ecclesiasticalYearId } : {}),
      dry_run: formData.get("dry_run") !== "false",
    });

    if (!response.data.dry_run) {
      revalidatePath("/dashboard/classes");
    }

    return { result: response.data };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo ejecutar el vencimiento manual.", {
        endpointLabel: "/admin/classes/enrollments/expire-overdue",
      }),
    };
  }
}
