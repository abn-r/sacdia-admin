"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { EvidenceType } from "@/lib/api/evidence-review";

const typeIntentMap: Record<EvidenceType, StatusIntent> = {
  folder: "primary",
  class: "neutral",
  honor: "success",
};

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  className?: string;
}

export function EvidenceTypeBadge({ type, className }: EvidenceTypeBadgeProps) {
  const t = useTranslations("evidence_review.typeBadge");
  const intent = typeIntentMap[type] ?? ("neutral" as StatusIntent);
  const label = type in typeIntentMap ? t(type as EvidenceType) : type;
  return <StatusBadge intent={intent} label={label} className={className} />;
}
