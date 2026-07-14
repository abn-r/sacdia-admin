"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { ValidationStatus } from "@/lib/api/validation";

interface ValidationStatusBadgeProps {
  status: ValidationStatus | string;
  className?: string;
}

type StatusLabelKey =
  | "PENDING"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_VALIDATION"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REVISION";

type StatusConfig = { labelKey: StatusLabelKey; intent: StatusIntent };

const STATUS_CONFIG: Partial<Record<ValidationStatus | string, StatusConfig>> = {
  PENDING: { labelKey: "PENDING", intent: "warning" },
  PENDING_REVIEW: { labelKey: "PENDING_REVIEW", intent: "warning" },
  IN_PROGRESS: { labelKey: "IN_PROGRESS", intent: "info" },
  SUBMITTED_FOR_VALIDATION: { labelKey: "SUBMITTED_FOR_VALIDATION", intent: "warning" },
  APPROVED: { labelKey: "APPROVED", intent: "success" },
  REJECTED: { labelKey: "REJECTED", intent: "destructive" },
  NEEDS_REVISION: { labelKey: "NEEDS_REVISION", intent: "neutral" },
};

export function ValidationStatusBadge({ status, className }: ValidationStatusBadgeProps) {
  const t = useTranslations("validation_admin.status");
  const config = STATUS_CONFIG[status];

  if (config) {
    return (
      <StatusBadge intent={config.intent} label={t(config.labelKey)} className={className} />
    );
  }

  return <StatusBadge intent="neutral" label={status} className={className} />;
}
