"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  patchNotificationCategorySetting,
  type PatchNotificationCategorySettingPayload,
} from "@/lib/api/notifications";
import { requireCapability } from "@/lib/auth/require-capability";

export type CategorySettingActionState = {
  error?: string;
  success?: string;
};

export async function updateNotificationCategorySettingAction(
  _prev: CategorySettingActionState,
  payload: PatchNotificationCategorySettingPayload,
): Promise<CategorySettingActionState> {
  const gate = await requireCapability("notifications-categories", "update");
  if (!gate.ok) return { error: gate.error };
  const t = await getTranslations("configuration.notifications.categories");

  try {
    await patchNotificationCategorySetting(payload);
    revalidatePath("/dashboard/configuration/notifications/categories");
    return { success: t("saveSuccess") };
  } catch (error) {
    return { error: getActionErrorMessage(error, t("saveError")) };
  }
}
