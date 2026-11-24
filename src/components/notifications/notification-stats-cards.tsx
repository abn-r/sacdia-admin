import { getFormatter, getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { getNotificationStats } from "@/lib/api/notifications";
import { errorStateFromError } from "@/lib/api/error-state";
import { summarizeStats } from "@/lib/notifications/stats";

const WINDOW_DAYS = 30;

/**
 * Figures of the last 30 days above the sent history. `/admin/notifications/stats`
 * only admits admin and super-admin: for anyone else (403) the strip is simply
 * not shown; any other failure is said, never rendered as zeros.
 */
export async function NotificationStatsCards() {
  const t = await getTranslations("people.community.notifications.kpis");

  let stats: Awaited<ReturnType<typeof getNotificationStats>>;
  try {
    stats = await getNotificationStats(WINDOW_DAYS);
  } catch (error) {
    const failure = errorStateFromError(error);
    if (failure.kind === "forbidden") return null;
    return (
      <ErrorState
        variant="inline"
        kind={failure.kind}
        icon={Bell}
        title={t("loadError")}
        retry
      />
    );
  }

  const format = await getFormatter();
  const summary = summarizeStats(stats);

  return (
    <KpiStrip aria-label={t("label")}>
      <KpiStripItem
        label={t("activeDevices")}
        value={format.number(summary.activeDevices)}
        subline={t("activeDevicesHint")}
      />
      <KpiStripItem
        label={t("idleDevices")}
        value={format.number(summary.idleDevices)}
        subline={t("windowHint", { days: WINDOW_DAYS })}
      />
      <KpiStripItem
        label={t("sent")}
        value={format.number(summary.sent)}
        subline={t("windowHint", { days: WINDOW_DAYS })}
      />
      <KpiStripItem
        label={t("delivered")}
        value={summary.deliveryRate === null ? "—" : format.number(summary.deliveryRate, { style: "percent", maximumFractionDigits: 1 })}
        subline={t("windowHint", { days: WINDOW_DAYS })}
      />
    </KpiStrip>
  );
}
