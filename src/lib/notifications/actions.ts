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
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
} from "@/lib/auth/permissions";

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
  fieldErrors?: Record<string, string>;
};

function collectCommonFieldErrors(
  t: NotificationsTranslator,
  title: string,
  body: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!title) errors.title = t("validation.title_required");
  if (!body) errors.body = t("validation.body_required");
  return errors;
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseSelectedTarget(value: string): {
  instanceType: NotificationInstanceType;
  instanceId: number;
} | null {
  if (!value) return null;
  const [typeRaw, idRaw] = value.split(":");
  if (!typeRaw || !idRaw || !isValidInstanceType(typeRaw)) {
    return null;
  }
  const instanceId = Number(idRaw);
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    return null;
  }

  return { instanceType: typeRaw, instanceId };
}

export async function sendDirectNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("notifications");

  if (!hasPermission(user, NOTIFICATIONS_SEND)) {
    return { error: t("errors.send_failed") };
  }

  const userId = readString(formData, "user_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  const fieldErrors = collectCommonFieldErrors(t, title, body);
  if (!userId) fieldErrors.user_id = t("validation.user_id_required");
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await sendNotification({ userId, title, body });
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
  const user = await requireAdminUser();
  const t = await getTranslations("notifications");

  if (!hasPermission(user, NOTIFICATIONS_BROADCAST)) {
    return { error: t("errors.broadcast_failed") };
  }

  const title = readString(formData, "title");
  const body = readString(formData, "body");

  const fieldErrors = collectCommonFieldErrors(t, title, body);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

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
  const user = await requireAdminUser();
  const t = await getTranslations("notifications");

  if (!hasPermission(user, NOTIFICATIONS_CLUB)) {
    return { error: t("errors.club_send_failed") };
  }

  const targetRaw = readString(formData, "instance_target");
  const selectedTarget = parseSelectedTarget(targetRaw);
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  const fieldErrors = collectCommonFieldErrors(t, title, body);
  if (!targetRaw) {
    fieldErrors.instance_id = t("validation.instance_id_required");
  } else if (!selectedTarget) {
    fieldErrors.instance_id = t("validation.instance_id_invalid");
  }

  if (Object.keys(fieldErrors).length > 0 || !selectedTarget) {
    return { fieldErrors };
  }

  const { instanceType, instanceId } = selectedTarget;

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
