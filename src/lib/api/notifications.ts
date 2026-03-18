import { apiRequest } from "@/lib/api/client";

export type SendNotificationPayload = {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type BroadcastNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type ClubNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendNotification(payload: SendNotificationPayload) {
  return apiRequest("/notifications/send", {
    method: "POST",
    body: payload,
  });
}

export async function broadcastNotification(payload: BroadcastNotificationPayload) {
  return apiRequest("/notifications/broadcast", {
    method: "POST",
    body: payload,
  });
}

export async function sendClubNotification(
  sectionId: number,
  payload: ClubNotificationPayload,
) {
  return apiRequest(`/notifications/section/${sectionId}`, {
    method: "POST",
    body: payload,
  });
}
