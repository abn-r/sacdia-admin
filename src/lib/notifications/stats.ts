import type { NotificationStatsResponse } from "@/lib/api/notifications";

export type NotificationStatsSummary = {
  activeDevices: number;
  idleDevices: number;
  sent: number;
  /** 0..1, or `null` when nothing was sent in the window. */
  deliveryRate: number | null;
};

/** `sent` counts what the push service accepted; the rate is accepted / (accepted + rejected). */
export function summarizeStats(stats: NotificationStatsResponse): NotificationStatsSummary {
  let sent = 0;
  let failed = 0;
  for (const day of stats.dailyDeliveryRate) {
    sent += day.tokens_sent;
    failed += day.tokens_failed;
  }
  const total = sent + failed;
  return {
    activeDevices: stats.activeTokens,
    idleDevices: stats.inactiveTokens30d,
    sent,
    deliveryRate: total === 0 ? null : sent / total,
  };
}
