"use server";

import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  sendNotification,
  broadcastNotification,
  sendClubNotification,
} from "@/lib/api/notifications";
import { requireAdminUser } from "@/lib/auth/session";

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

  const sectionIdRaw = readString(formData, "section_id");
  const title = readString(formData, "title");
  const body = readString(formData, "body");

  if (!sectionIdRaw) return { error: "El ID de sección es obligatorio" };
  if (!title) return { error: "El título es obligatorio" };
  if (!body) return { error: "El mensaje es obligatorio" };

  const sectionId = Number(sectionIdRaw);
  if (!Number.isFinite(sectionId) || sectionId <= 0) {
    return { error: "El ID de sección no es válido" };
  }

  try {
    await sendClubNotification(sectionId, { title, body });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo enviar la notificación a la sección", {
        endpointLabel: `/notifications/section/${sectionId}`,
      }),
    };
  }

  return { success: "Notificación de sección enviada correctamente" };
}
