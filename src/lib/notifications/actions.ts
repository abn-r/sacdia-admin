"use server";

import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  sendNotification,
  broadcastNotification,
  sendClubNotification,
  type NotificationInstanceType,
} from "@/lib/api/notifications";
import { requireAdminUser } from "@/lib/auth/session";

type NotificationsTranslator = Awaited<
  ReturnType<typeof getTranslations<"notifications">>
>;

const VALID_INSTANCE_TYPES: NotificationInstanceType[] = [
  'adventurers',
  'pathfinders',
  'master_guilds',
];

function isValidInstanceType(value: string): value is NotificationInstanceType {
  return (VALID_INSTANCE_TYPES as string[]).includes(value);
}

export type NotificationActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validateCommonFields(
  t: NotificationsTranslator,
  title: string,
  body: string,
): string | null {
  if (!title) return t("validation.title_required");
  if (!body) return t("validation.body_required");
  return null;
}

export async function sendDirectNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();
  const t = await getTranslations("notifications");

  const userId = readString(formData, "user_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!userId) return { error: t("validation.user_id_required") };
  const commonError = validateCommonFields(t, title, body);
  if (commonError) return { error: commonError };

  try {
    await sendNotification({ user_id: userId, title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.send_failed"), {
        endpointLabel: "/notifications/send",
      }),
    };
  }

  return { success: t("success.sent") };
}

export async function broadcastNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();
  const t = await getTranslations("notifications");

  const title = readString(formData, "title");
  const body = readString(formData, "body");

  const commonError = validateCommonFields(t, title, body);
  if (commonError) return { error: commonError };

  try {
    await broadcastNotification({ title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.broadcast_failed"), {
        endpointLabel: "/notifications/broadcast",
      }),
    };
  }

  return { success: t("success.broadcast_sent") };
}

export async function clubNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();
  const t = await getTranslations("notifications");

  const instanceType = readString(formData, "instance_type");
  const instanceIdRaw = readString(formData, "instance_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!instanceType) return { error: t("validation.instance_type_required") };
  if (!isValidInstanceType(instanceType)) {
    return { error: t("validation.instance_type_invalid") };
  }
  if (!instanceIdRaw) return { error: t("validation.instance_id_required") };
  const commonError = validateCommonFields(t, title, body);
  if (commonError) return { error: commonError };

  const instanceId = Number(instanceIdRaw);
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    return { error: t("validation.instance_id_invalid") };
  }

  try {
    await sendClubNotification(instanceType, instanceId, { title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.club_send_failed"), {
        endpointLabel: `/notifications/club/${instanceType}/${instanceId}`,
      }),
    };
  }

  return { success: t("success.club_sent") };
}
