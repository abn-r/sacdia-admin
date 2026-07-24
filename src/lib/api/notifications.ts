import type { NotificationCategorySetting } from "@/lib/notifications/categories";
import { apiRequest } from "@/lib/api/client";

export type SendNotificationPayload = {
  userId: string;
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

export type NotificationInstanceType = 'adventurers' | 'pathfinders' | 'master_guilds';

export type NotificationLogSender = {
  user_id: string;
  name: string | null;
  paternal_last_name: string | null;
  email: string;
};

export type NotificationLog = {
  log_id: number;
  title: string;
  body: string;
  type: string;
  target_type: string;
  target_id: string | null;
  sent_by: string | null;
  tokens_sent: number;
  tokens_failed: number;
  created_at: string;
  users: NotificationLogSender | null;
};

export type NotificationHistoryResponse = {
  data: NotificationLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  instanceType: NotificationInstanceType,
  instanceId: number,
  payload: ClubNotificationPayload,
) {
  return apiRequest(`/notifications/club/${instanceType}/${instanceId}`, {
    method: "POST",
    body: payload,
  });
}

export async function getNotificationHistory(
  page = 1,
  limit = 20,
): Promise<NotificationHistoryResponse> {
  return apiRequest<NotificationHistoryResponse>("/notifications/history", {
    params: { page, limit },
  });
}

export type DailyDeliveryRate = {
  date: string;
  tokens_sent: number;
  tokens_failed: number;
  success_rate: number | null;
};

export type NotificationStatsResponse = {
  activeTokens: number;
  inactiveTokens30d: number;
  dailyDeliveryRate: DailyDeliveryRate[];
};

export async function getNotificationStats(
  days = 30,
): Promise<NotificationStatsResponse> {
  return apiRequest<NotificationStatsResponse>("/admin/notifications/stats", {
    params: { days },
  });
}

export async function getNotificationCategorySettings(): Promise<
  NotificationCategorySetting[]
> {
  return apiRequest<NotificationCategorySetting[]>(
    "/admin/notifications/categories",
  );
}

export type PatchNotificationCategorySettingPayload = {
  category: string;
  mobileEnabled?: boolean;
  defaultEnabled?: boolean;
};

export async function patchNotificationCategorySetting(
  payload: PatchNotificationCategorySettingPayload,
): Promise<NotificationCategorySetting[]> {
  return apiRequest<NotificationCategorySetting[]>(
    "/admin/notifications/categories",
    {
      method: "PATCH",
      body: payload,
    },
  );
}
