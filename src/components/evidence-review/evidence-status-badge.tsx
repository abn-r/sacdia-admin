import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { EvidenceType } from "@/lib/api/evidence-review";

type IntentConfig = { label: string; intent: StatusIntent };

// Backend enum evidence_validation_enum: PENDING | SUBMITTED | VALIDATED | REJECTED
// Applies to folders_section_records.status AND class_section_progress.status
const folderClassStatusMap: Record<string, IntentConfig> = {
  PENDING: { label: "Sin enviar", intent: "neutral" },
  SUBMITTED: { label: "Enviado", intent: "info" },
  VALIDATED: { label: "Validado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
  pendiente: { label: "Enviado", intent: "info" },
  validado: { label: "Validado", intent: "success" },
  rechazado: { label: "Rechazado", intent: "destructive" },
};

const honorStatusMap: Record<string, IntentConfig> = {
  PENDING: { label: "Sin enviar", intent: "neutral" },
  SUBMITTED: { label: "Enviado", intent: "info" },
  VALIDATED: { label: "Validado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
  in_progress: { label: "Enviado", intent: "info" },
  validated: { label: "Validado", intent: "success" },
  rejected: { label: "Rechazado", intent: "destructive" },
};

interface EvidenceStatusBadgeProps {
  status: string;
  type: EvidenceType;
  className?: string;
}

export function EvidenceStatusBadge({ status, type, className }: EvidenceStatusBadgeProps) {
  const configMap = type === "honor" ? honorStatusMap : folderClassStatusMap;
  const config = configMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
