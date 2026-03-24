import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/api/requests";

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  APPROVED: {
    label: "Aprobado",
    className: "bg-success/10 text-success border-success/20",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

interface RequestStatusBadgeProps {
  status: RequestStatus | string;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = statusConfig[status as RequestStatus] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
