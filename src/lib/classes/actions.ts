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

type OptionalPositiveIntResult =
  | { ok: true; value?: number }
  | { ok: false; error: string };

function readOptionalPositiveInt(formData: FormData, field: string): OptionalPositiveIntResult {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return { ok: true };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      error: "El año eclesiástico debe ser un ID entero positivo o quedar vacío para usar el año activo del backend.",
    };
  }
  return { ok: true, value: parsed };
}

export async function expireOverdueClassEnrollmentsAction(
  _: ClassExpirationActionState,
  formData: FormData,
): Promise<ClassExpirationActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CLASSES_MANAGE])) {
    return { error: "Sin permisos para vencer inscripciones." };
  }

  const ecclesiasticalYear = readOptionalPositiveInt(formData, "ecclesiastical_year_id");
  if (!ecclesiasticalYear.ok) {
    return { error: ecclesiasticalYear.error };
  }

  try {
    const response = await expireOverdueClassEnrollments({
      ...(ecclesiasticalYear.value
        ? { ecclesiastical_year_id: ecclesiasticalYear.value }
        : {}),
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
