"use server";

import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  sendNotification,
  broadcastNotification,
  sendClubNotification,
  type NotificationInstanceType,
} from "@/lib/api/notifications";
import { requireAdminUser } from "@/lib/auth/session";

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

export async function sendDirectNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();

  const userId = readString(formData, "user_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!userId) return { error: "El ID de usuario es obligatorio" };
  if (!title) return { error: "El título es obligatorio" };
  if (!body) return { error: "El mensaje es obligatorio" };

  try {
    await sendNotification({ user_id: userId, title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo enviar la notificación", {
        endpointLabel: "/notifications/send",
      }),
    };
  }

  return { success: "Notificación enviada correctamente" };
}

export async function broadcastNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();

  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!title) return { error: "El título es obligatorio" };
  if (!body) return { error: "El mensaje es obligatorio" };

  try {
    await broadcastNotification({ title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo enviar el broadcast", {
        endpointLabel: "/notifications/broadcast",
      }),
    };
  }

  return { success: "Broadcast enviado correctamente" };
}

export async function clubNotificationAction(
  _: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  await requireAdminUser();

  const instanceType = readString(formData, "instance_type");
  const instanceIdRaw = readString(formData, "instance_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!instanceType) return { error: "El tipo de club es obligatorio" };
  if (!isValidInstanceType(instanceType)) {
    return { error: "El tipo de club no es válido" };
  }
  if (!instanceIdRaw) return { error: "El ID de instancia es obligatorio" };
  if (!title) return { error: "El título es obligatorio" };
  if (!body) return { error: "El mensaje es obligatorio" };

  const instanceId = Number(instanceIdRaw);
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    return { error: "El ID de instancia no es válido" };
  }

  try {
    await sendClubNotification(instanceType, instanceId, { title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo enviar la notificación al club", {
        endpointLabel: `/notifications/club/${instanceType}/${instanceId}`,
      }),
    };
  }

  return { success: "Notificación de club enviada correctamente" };
}
