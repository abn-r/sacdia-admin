import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/api/evidence-review";

type StatusConfig = { label: string; className: string };

// Folder and class statuses
const folderClassStatusConfig: Record<string, StatusConfig> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  validado: {
    label: "Validado",
    className: "bg-success/10 text-success border-success/20",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

// Honor statuses
const honorStatusConfig: Record<string, StatusConfig> = {
  in_progress: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  validated: {
    label: "Validado",
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

interface EvidenceStatusBadgeProps {
  status: string;
  type: EvidenceType;
  className?: string;
}

export function EvidenceStatusBadge({ status, type, className }: EvidenceStatusBadgeProps) {
  const configMap = type === "honor" ? honorStatusConfig : folderClassStatusConfig;
  const config = configMap[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
