import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvestitureStatus } from "@/lib/api/investiture";

const statusConfig: Record<
  InvestitureStatus,
  { label: string; className: string }
> = {
  IN_PROGRESS: {
    label: "En progreso",
    className: "bg-muted text-muted-foreground border-border",
  },
  SUBMITTED_FOR_VALIDATION: {
    label: "Enviado",
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
  INVESTIDO: {
    label: "Investido",
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

interface InvestitureStatusBadgeProps {
  status: InvestitureStatus;
  className?: string;
}

export function InvestitureStatusBadge({
  status,
  className,
}: InvestitureStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
