"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { ValidationStatus } from "@/lib/api/validation";

interface ValidationStatusBadgeProps {
  status: ValidationStatus;
  className?: string;
}

export function ValidationStatusBadge({ status, className }: ValidationStatusBadgeProps) {
  const t = useTranslations("validation_admin");

  const statusMap: Record<ValidationStatus, { label: string; intent: StatusIntent }> = {
    PENDING: { label: t("status.PENDING"), intent: "warning" },
    APPROVED: { label: t("status.APPROVED"), intent: "success" },
    REJECTED: { label: t("status.REJECTED"), intent: "destructive" },
    NEEDS_REVISION: { label: t("status.NEEDS_REVISION"), intent: "neutral" },
  };

  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
