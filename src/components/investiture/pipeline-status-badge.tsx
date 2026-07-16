"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { PipelineStatus } from "@/lib/api/investiture";

interface PipelineStatusBadgeProps {
  status: PipelineStatus;
  className?: string;
}

export function PipelineStatusBadge({ status, className }: PipelineStatusBadgeProps) {
  const t = useTranslations("investiture");

  const statusMap: Record<PipelineStatus, { label: string; intent: StatusIntent }> = {
    SUBMITTED: { label: t("pipelineStatusBadge.submitted"), intent: "warning" },
    CLUB_APPROVED: { label: t("pipelineStatusBadge.clubApproved"), intent: "progress-1" },
    COORDINATOR_APPROVED: { label: t("pipelineStatusBadge.coordinatorApproved"), intent: "progress-2" },
    FIELD_APPROVED: { label: t("pipelineStatusBadge.fieldApproved"), intent: "progress-3" },
    INVESTED: { label: t("pipelineStatusBadge.invested"), intent: "primary" },
    REJECTED: { label: t("pipelineStatusBadge.rejected"), intent: "destructive" },
  };

  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
