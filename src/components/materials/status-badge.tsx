import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MaterialEstado } from "@/lib/types/materials";

const STATUS_CONFIG: Record<
  MaterialEstado,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  en_revision: { label: "En revisión", variant: "secondary" },
  aprobada: {
    label: "Aprobada",
    variant: "outline",
    className: "border-warning/30 bg-warning/15 text-warning-foreground dark:text-warning",
  },
  pagada: {
    label: "Pagada",
    variant: "outline",
    className: "border-success/25 bg-success/10 text-success-foreground dark:text-success",
  },
  entregada: { label: "Entregada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

interface StatusBadgeProps {
  estado: MaterialEstado;
  className?: string;
}

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[estado] ?? {
    label: estado,
    variant: "outline" as const,
  };

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
