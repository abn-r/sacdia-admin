"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useUrlTab, type UrlTabItem } from "@/components/shared/url-tabs";
import type { RequestStatus } from "@/lib/api/requests";
import { cn } from "@/lib/utils";

import { LONG_WAIT_DAYS, waitingDays } from "@/lib/requests/waiting";

export { LONG_WAIT_DAYS, isLongWait, waitingDays } from "@/lib/requests/waiting";
export const QUEUE_PAGE_SIZE = 20;
export const ALL_FILTER = "";

export type QueueTab = "pending" | "approved" | "rejected" | "all";
export const QUEUE_TABS: readonly QueueTab[] = ["pending", "approved", "rejected", "all"];

const TAB_STATUS: Record<QueueTab, RequestStatus | null> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  all: null,
};

/** Days waiting; amber (warning token) from 14 days. */
export function WaitingTime({ createdAt, className }: { createdAt: string; className?: string }) {
  const t = useTranslations("queues.requests.common");
  const days = waitingDays(createdAt);
  const long = days >= LONG_WAIT_DAYS;
  return (
    <span
      data-long-wait={long ? "true" : undefined}
      className={cn("tabular-nums", long ? "font-medium text-warning" : "text-muted-foreground", className)}
      title={long ? t("longWaitHint", { days: LONG_WAIT_DAYS }) : undefined}
    >
      {t("waiting", { count: days })}
    </span>
  );
}

export function personName(
  user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null,
): string {
  if (!user) return "—";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.email || "—";
}

/**
 * Tabs by state with real counts, driven by `?tab=`. The counts come from the
 * whole list, so they stay true while another tab is open.
 */
export function useQueueTabs<T extends { status: RequestStatus }>(
  rows: readonly T[] | undefined,
) {
  const t = useTranslations("queues.requests.common.tabs");
  const urlTab = useUrlTab("tab", "pending");
  const active: QueueTab = (QUEUE_TABS as readonly string[]).includes(urlTab)
    ? (urlTab as QueueTab)
    : "pending";

  const items = useMemo<UrlTabItem[]>(() => {
    const count = (status: RequestStatus | null) =>
      rows === undefined
        ? undefined
        : status === null
          ? rows.length
          : rows.filter((row) => row.status === status).length;
    return QUEUE_TABS.map((tab) => {
      const n = count(TAB_STATUS[tab]);
      return { value: tab, label: t(tab), ...(n !== undefined ? { count: n } : {}) };
    });
  }, [rows, t]);

  const inTab = useMemo(
    () => (rows ?? []).filter((row) => TAB_STATUS[active] === null || row.status === TAB_STATUS[active]),
    [rows, active],
  );

  return { active, items, inTab };
}
