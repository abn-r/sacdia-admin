"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";

interface PeriodicReportStatusBadgeProps {
  status: string;
  size?: "xs" | "sm" | "default";
}

/** draft = En curso (data still updates), finalized = Cerrado (frozen). */
export function PeriodicReportStatusBadge({ status, size }: PeriodicReportStatusBadgeProps) {
  const t = useTranslations("periodicReports.common.status");

  switch (status) {
    case "draft":
      return <StatusBadge intent="info" label={t("draft")} size={size} />;
    case "finalized":
      return <StatusBadge intent="neutral" label={t("finalized")} size={size} />;
    default:
      return <StatusBadge intent="neutral" label={status || "—"} size={size} />;
  }
}
