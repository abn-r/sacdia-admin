"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { FolderStatus } from "@/lib/api/annual-folders";

type StatusConfig = { intent: StatusIntent };

const STATUS_INTENTS: Record<FolderStatus, StatusConfig> = {
  open: { intent: "info" },
  submitted: { intent: "warning" },
  under_evaluation: { intent: "progress-2" },
  evaluated: { intent: "progress-3" },
  closed: { intent: "success" },
};

interface FolderStatusBadgeProps {
  status: FolderStatus;
  className?: string;
}

export function FolderStatusBadge({ status, className }: FolderStatusBadgeProps) {
  const t = useTranslations("annual_folders");
  const config = STATUS_INTENTS[status] ?? { intent: "neutral" as StatusIntent };
  const label = (status in STATUS_INTENTS)
    ? t(`statusBadge.${status}` as Parameters<typeof t>[0])
    : status;
  return <StatusBadge intent={config.intent} label={label} className={className} />;
}
