import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { ValidationStatus } from "@/lib/api/validation";

const statusMap: Record<ValidationStatus, { label: string; intent: StatusIntent }> = {
  PENDING: { label: "Pendiente", intent: "warning" },
  APPROVED: { label: "Aprobado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
  NEEDS_REVISION: { label: "Revisión", intent: "neutral" },
};

interface ValidationStatusBadgeProps {
  status: ValidationStatus;
  className?: string;
}

export function ValidationStatusBadge({ status, className }: ValidationStatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
