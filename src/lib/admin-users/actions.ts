"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  updateAdminUserApproval,
  type AdminApprovalDecision,
} from "@/lib/api/admin-users";
import {
  APP_ALERT_PARAM_TYPE,
  APP_ALERT_PARAM_TITLE,
  APP_ALERT_PARAM_DESCRIPTION,
} from "@/lib/ui/app-alert-params";

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function userDetailUrl(userId: string, alertType: string, alertTitle: string, alertDescription?: string): string {
  const params = new URLSearchParams();
  params.set(APP_ALERT_PARAM_TYPE, alertType);
  params.set(APP_ALERT_PARAM_TITLE, alertTitle);
  if (alertDescription) {
    params.set(APP_ALERT_PARAM_DESCRIPTION, alertDescription);
  }
  return `/dashboard/users/${encodeURIComponent(userId)}?${params.toString()}`;
}

export async function submitApprovalDecisionAction(formData: FormData) {
  const userId = readString(formData, "user_id");
  const decision = readString(formData, "decision");
  const reason = readString(formData, "reason");

  if (!userId) {
    redirect("/dashboard/users");
  }

  if (decision !== "approve" && decision !== "reject") {
    redirect(userDetailUrl(userId, "error", "Decision invalida", "El valor de la decision no es valido."));
  }

  try {
    await updateAdminUserApproval({
      userId,
      decision: decision as AdminApprovalDecision,
      reason: reason || undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        redirect(userDetailUrl(userId, "warning", "Demasiadas solicitudes", "Espera un momento antes de intentarlo de nuevo."));
      }

      if (error.status === 401 || error.status === 403) {
        redirect(userDetailUrl(userId, "error", "Sin permisos", "No tienes permisos para realizar esta accion."));
      }

      if (error.status === 404 || error.status === 405) {
        redirect(userDetailUrl(userId, "error", "Endpoint no disponible", "El endpoint de aprobacion no esta disponible en este momento."));
      }

      redirect(userDetailUrl(userId, "error", "Error al procesar", error.message));
    }

    redirect(userDetailUrl(userId, "error", "Error inesperado", "No se pudo procesar la aprobacion. Intenta de nuevo."));
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard");

  const decisionLabel = decision === "approve" ? "aprobado" : "rechazado";
  redirect(userDetailUrl(userId, "success", `Usuario ${decisionLabel}`, `La decision se registro correctamente.`));
}
