"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";

interface PeriodicReportStatusBadgeProps {
  status: string;
  size?: "xs" | "sm" | "default";
}

/** draft = Borrador, finalized = Finalizado, archived = Archivado. */
export function PeriodicReportStatusBadge({ status, size }: PeriodicReportStatusBadgeProps) {
  const t = useTranslations("periodicReports.common.status");

  switch (status) {
    case "draft":
      return <StatusBadge intent="warning" label={t("draft")} size={size} />;
    case "finalized":
      return <StatusBadge intent="success" label={t("finalized")} size={size} />;
    case "archived":
      return <StatusBadge intent="neutral" label={t("archived")} size={size} />;
    default:
      return <StatusBadge intent="neutral" label={status || "—"} size={size} />;
  }
}
