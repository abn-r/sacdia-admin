import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/api/investiture";

const statusConfig: Record<PipelineStatus, { label: string; className: string }> = {
  SUBMITTED: {
    label: "Enviado",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  CLUB_APPROVED: {
    label: "Aprobado por club",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  COORDINATOR_APPROVED: {
    label: "Aprobado por coordinación",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  FIELD_APPROVED: {
    label: "Aprobado por campo",
    className: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  INVESTED: {
    label: "Investido",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

interface PipelineStatusBadgeProps {
  status: PipelineStatus;
  className?: string;
}

export function PipelineStatusBadge({ status, className }: PipelineStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
