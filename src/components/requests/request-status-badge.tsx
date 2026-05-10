"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { RequestStatus } from "@/lib/api/requests";

interface RequestStatusBadgeProps {
  status: RequestStatus | string;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const t = useTranslations("requests");

  const statusMap: Record<RequestStatus, { label: string; intent: StatusIntent }> = {
    PENDING: { label: t("status.PENDING"), intent: "warning" },
    APPROVED: { label: t("status.APPROVED"), intent: "success" },
    REJECTED: { label: t("status.REJECTED"), intent: "destructive" },
  };

  const config = statusMap[status as RequestStatus] ?? {
    label: status,
    intent: "neutral" as StatusIntent,
  };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
