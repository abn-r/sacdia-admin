import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FolderStatus } from "@/lib/api/annual-folders";

const statusConfig: Record<FolderStatus, { label: string; className: string }> = {
  open: {
    label: "Abierta",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  submitted: {
    label: "Enviada",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  under_evaluation: {
    label: "En evaluación",
    className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  },
  evaluated: {
    label: "Evaluado",
    className: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  },
  closed: {
    label: "Cerrada",
    className: "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-400",
  },
};

interface FolderStatusBadgeProps {
  status: FolderStatus;
  className?: string;
}

export function FolderStatusBadge({ status, className }: FolderStatusBadgeProps) {
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
