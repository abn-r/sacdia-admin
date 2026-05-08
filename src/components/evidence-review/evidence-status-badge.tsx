"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { EvidenceType } from "@/lib/api/evidence-review";

type IntentConfig = { labelKey: string; intent: StatusIntent };

// Backend enum evidence_validation_enum: PENDING | SUBMITTED | VALIDATED | REJECTED
// Applies to folders_section_records.status AND class_section_progress.status
const folderClassIntentMap: Record<string, IntentConfig> = {
  PENDING:   { labelKey: "no_submit",  intent: "neutral" },
  SUBMITTED: { labelKey: "submitted",  intent: "info" },
  VALIDATED: { labelKey: "validated",  intent: "success" },
  REJECTED:  { labelKey: "rejected",   intent: "destructive" },
  pendiente: { labelKey: "submitted",  intent: "info" },
  validado:  { labelKey: "validated",  intent: "success" },
  rechazado: { labelKey: "rejected",   intent: "destructive" },
};

const honorIntentMap: Record<string, IntentConfig> = {
  PENDING:     { labelKey: "no_submit",  intent: "neutral" },
  SUBMITTED:   { labelKey: "submitted",  intent: "info" },
  VALIDATED:   { labelKey: "validated",  intent: "success" },
  REJECTED:    { labelKey: "rejected",   intent: "destructive" },
  in_progress: { labelKey: "submitted",  intent: "info" },
  validated:   { labelKey: "validated",  intent: "success" },
  rejected:    { labelKey: "rejected",   intent: "destructive" },
};

interface EvidenceStatusBadgeProps {
  status: string;
  type: EvidenceType;
  className?: string;
}

export function EvidenceStatusBadge({ status, type, className }: EvidenceStatusBadgeProps) {
  const t = useTranslations("evidence_review.statusBadge");
  const configMap = type === "honor" ? honorIntentMap : folderClassIntentMap;
  const config = configMap[status];
  const label = config ? t(config.labelKey as "no_submit" | "submitted" | "validated" | "rejected") : status;
  const intent: StatusIntent = config?.intent ?? "neutral";
  return <StatusBadge intent={intent} label={label} className={className} />;
}
