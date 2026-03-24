import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ValidationStatus } from "@/lib/api/validation";

const statusConfig: Record<ValidationStatus, { label: string; className: string }> = {
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
  NEEDS_REVISION: {
    label: "Revisión",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface ValidationStatusBadgeProps {
  status: ValidationStatus;
  className?: string;
}

export function ValidationStatusBadge({ status, className }: ValidationStatusBadgeProps) {
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
