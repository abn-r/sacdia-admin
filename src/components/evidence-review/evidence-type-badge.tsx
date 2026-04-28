import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { EvidenceType } from "@/lib/api/evidence-review";

const typeMap: Record<EvidenceType, { label: string; intent: StatusIntent }> = {
  folder: { label: "Carpeta", intent: "primary" },
  class: { label: "Clase", intent: "neutral" },
  honor: { label: "Honor", intent: "success" },
};

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  className?: string;
}

export function EvidenceTypeBadge({ type, className }: EvidenceTypeBadgeProps) {
  const config = typeMap[type] ?? { label: type, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
