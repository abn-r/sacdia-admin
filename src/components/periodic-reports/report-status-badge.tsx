"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";

interface PeriodicReportStatusBadgeProps {
  status: string;
  size?: "xs" | "sm" | "default";
}

/**
 * draft = En curso (data still updates), finalized = Cerrado (frozen). Only the
 * exception is marked: «En curso» is a badge, «Cerrado» is plain text.
 */
export function PeriodicReportStatusBadge({ status, size }: PeriodicReportStatusBadgeProps) {
  const t = useTranslations("periodicReports.common.status");

  switch (status) {
    case "draft":
      return <StatusBadge intent="info" label={t("draft")} size={size} />;
    case "finalized":
      return <span className="text-sm text-muted-foreground">{t("finalized")}</span>;
    default:
      return <span className="text-sm text-muted-foreground">{status || "—"}</span>;
  }
}
