import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { RequestStatus } from "@/lib/api/requests";

const statusMap: Record<RequestStatus, { label: string; intent: StatusIntent }> = {
  PENDING: { label: "Pendiente", intent: "warning" },
  APPROVED: { label: "Aprobado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
};

interface RequestStatusBadgeProps {
  status: RequestStatus | string;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = statusMap[status as RequestStatus] ?? {
    label: status,
    intent: "neutral" as StatusIntent,
  };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
