import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { PipelineStatus } from "@/lib/api/investiture";

const statusMap: Record<PipelineStatus, { label: string; intent: StatusIntent }> = {
  SUBMITTED: { label: "Enviado", intent: "warning" },
  CLUB_APPROVED: { label: "Aprobado por club", intent: "progress-1" },
  COORDINATOR_APPROVED: { label: "Aprobado por coordinación", intent: "progress-2" },
  FIELD_APPROVED: { label: "Aprobado por campo", intent: "progress-3" },
  INVESTED: { label: "Investido", intent: "primary" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
};

interface PipelineStatusBadgeProps {
  status: PipelineStatus;
  className?: string;
}

export function PipelineStatusBadge({ status, className }: PipelineStatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
