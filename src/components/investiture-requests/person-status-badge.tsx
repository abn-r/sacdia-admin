"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { InvestiturePersonStatus } from "@/lib/api/investiture-requests";

interface PersonStatusBadgeProps {
  status: InvestiturePersonStatus;
  className?: string;
}

const INTENT_BY_STATUS: Record<InvestiturePersonStatus, StatusIntent> = {
  PENDING: "warning",
  INVESTED: "success",
  REJECTED_BY_PERSON: "destructive",
  REJECTED_BY_SYSTEM: "destructive",
  REMOVED: "neutral",
  CLOSED_YEAR: "neutral",
};

export function PersonStatusBadge({ status, className }: PersonStatusBadgeProps) {
  const t = useTranslations("investiture_requests.status");

  const labels: Record<InvestiturePersonStatus, string> = {
    PENDING: t("pending"),
    INVESTED: t("invested"),
    REJECTED_BY_PERSON: t("rejected_by_person"),
    REJECTED_BY_SYSTEM: t("rejected_by_system"),
    REMOVED: t("removed"),
    CLOSED_YEAR: t("closed_year"),
  };

  return (
    <StatusBadge
      intent={INTENT_BY_STATUS[status] ?? "neutral"}
      label={labels[status] ?? status}
      className={className}
    />
  );
}
