"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireCapability } from "@/lib/auth/require-capability";

export type CompleteStepResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function completeStep(
  userId: string,
  step: 1 | 2 | 3,
): Promise<CompleteStepResult> {
  // POST /users/:id/post-registration/step-N/complete — registration:complete
  // (or users:update_profile), the `registration.complete` verb of the users screen.
  const gate = await requireCapability("users", "registration.complete");
  if (!gate.ok) return { ok: false, error: gate.error };
  const t = await getTranslations("post_registration");

  try {
    const payload = await apiRequest<{ status: string; message: string }>(
      `/users/${encodeURIComponent(userId)}/post-registration/step-${step}/complete`,
      { method: "POST" },
    );
    revalidatePath(`/dashboard/users/${userId}`);
    return {
      ok: true,
      message: payload.message ?? t("success.step_completed", { step }),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: t("errors.step_failed", { step }) };
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
