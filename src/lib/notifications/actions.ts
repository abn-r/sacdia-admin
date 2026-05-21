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

  const fieldErrors = collectCommonFieldErrors(t, title, body);
  if (!userId) fieldErrors.user_id = t("validation.user_id_required");
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

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
  await requireAdminUser();
  const t = await getTranslations("notifications");

  const instanceType = readString(formData, "instance_type");
  const instanceIdRaw = readString(formData, "instance_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  const fieldErrors = collectCommonFieldErrors(t, title, body);
  if (!instanceType) {
    fieldErrors.instance_type = t("validation.instance_type_required");
  } else if (!isValidInstanceType(instanceType)) {
    fieldErrors.instance_type = t("validation.instance_type_invalid");
  }

  if (!instanceIdRaw) {
    fieldErrors.instance_id = t("validation.instance_id_required");
  } else {
    const parsedId = Number(instanceIdRaw);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      fieldErrors.instance_id = t("validation.instance_id_invalid");
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const instanceId = Number(instanceIdRaw);

  try {
    await sendClubNotification(
      instanceType as NotificationInstanceType,
      instanceId,
      { title, body },
    );
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.club_send_failed"), {
        endpointLabel: `/notifications/club/${instanceType}/${instanceId}`,
      }),
    };
  }

  return { success: t("success.club_sent") };
}
