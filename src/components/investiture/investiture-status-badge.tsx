import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { InvestitureStatus } from "@/lib/api/investiture";

const statusMap: Record<InvestitureStatus, { label: string; intent: StatusIntent }> = {
  IN_PROGRESS: { label: "En progreso", intent: "neutral" },
  SUBMITTED_FOR_VALIDATION: { label: "Enviado", intent: "warning" },
  SUBMITTED: { label: "Enviado", intent: "warning" },
  CLUB_APPROVED: { label: "Aprobado por club", intent: "progress-1" },
  COORDINATOR_APPROVED: { label: "Aprobado por coordinación", intent: "progress-2" },
  FIELD_APPROVED: { label: "Aprobado por campo", intent: "progress-3" },
  APPROVED: { label: "Aprobado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
  INVESTED: { label: "Investido", intent: "primary" },
  INVESTIDO: { label: "Investido", intent: "primary" },
};

interface InvestitureStatusBadgeProps {
  status: InvestitureStatus;
  className?: string;
}

export function InvestitureStatusBadge({ status, className }: InvestitureStatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
