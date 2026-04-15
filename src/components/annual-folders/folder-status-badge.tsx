import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { FolderStatus } from "@/lib/api/annual-folders";

const statusMap: Record<FolderStatus, { label: string; intent: StatusIntent }> = {
  open: { label: "Abierta", intent: "info" },
  submitted: { label: "Enviada", intent: "warning" },
  under_evaluation: { label: "En evaluación", intent: "progress-2" },
  evaluated: { label: "Evaluado", intent: "progress-3" },
  closed: { label: "Cerrada", intent: "success" },
};

interface FolderStatusBadgeProps {
  status: FolderStatus;
  className?: string;
}

export function FolderStatusBadge({ status, className }: FolderStatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} className={className} />;
}
