"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { InvestitureStatus } from "@/lib/api/investiture";

interface InvestitureStatusBadgeProps {
  status: InvestitureStatus;
  className?: string;
}

export function InvestitureStatusBadge({ status, className }: InvestitureStatusBadgeProps) {
  const t = useTranslations("investiture");

  const statusMap: Record<InvestitureStatus, { label: string; intent: StatusIntent }> = {
    IN_PROGRESS: { label: t("statusBadge.inProgress"), intent: "neutral" },
    SUBMITTED_FOR_VALIDATION: { label: t("statusBadge.submittedForValidation"), intent: "warning" },
    SUBMITTED: { label: t("statusBadge.submitted"), intent: "warning" },
    CLUB_APPROVED: { label: t("statusBadge.clubApproved"), intent: "progress-1" },
    COORDINATOR_APPROVED: { label: t("statusBadge.coordinatorApproved"), intent: "progress-2" },
    FIELD_APPROVED: { label: t("statusBadge.fieldApproved"), intent: "progress-3" },
    APPROVED: { label: t("statusBadge.approved"), intent: "success" },
    REJECTED: { label: t("statusBadge.rejected"), intent: "destructive" },
    INVESTED: { label: t("statusBadge.invested"), intent: "primary" },
    INVESTIDO: { label: t("statusBadge.invested"), intent: "primary" },
  };

  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
