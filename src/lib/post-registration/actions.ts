"use server";

import { revalidatePath } from "next/cache";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export type CompleteStepResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function completeStep(
  userId: string,
  step: 1 | 2 | 3,
): Promise<CompleteStepResult> {
  await requireAdminUser();

  try {
    const payload = await apiRequest<{ status: string; message: string }>(
      `/users/${encodeURIComponent(userId)}/post-registration/step-${step}/complete`,
      { method: "POST" },
    );
    revalidatePath(`/dashboard/users/${userId}`);
    return { ok: true, message: payload.message ?? `Paso ${step} completado` };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: `Error al completar el paso ${step}` };
  }
}

export async function completeStep1Action(
  userId: string,
): Promise<CompleteStepResult> {
  return completeStep(userId, 1);
}

export async function completeStep2Action(
  userId: string,
): Promise<CompleteStepResult> {
  return completeStep(userId, 2);
}

export async function completeStep3Action(
  userId: string,
): Promise<CompleteStepResult> {
  return completeStep(userId, 3);
}
