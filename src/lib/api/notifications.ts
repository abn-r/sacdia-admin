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

export type ClubInstanceType = "adventurers" | "pathfinders" | "master_guilds";

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
  instanceType: ClubInstanceType,
  instanceId: number,
  payload: ClubNotificationPayload,
) {
  return apiRequest(`/notifications/club/${instanceType}/${instanceId}`, {
    method: "POST",
    body: payload,
  });
}
