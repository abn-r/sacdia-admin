import { Badge } from "@/components/ui/badge";
import type { MaterialEstado } from "@/lib/types/materials";

const STATUS_CONFIG: Record<
  MaterialEstado,
  {
    label: string;
    variant: "secondary" | "warning" | "success" | "destructive" | "outline";
  }
> = {
  en_revision: { label: "En revisión", variant: "secondary" },
  aprobada: { label: "Aprobada", variant: "warning" },
  pagada: { label: "Pagada", variant: "success" },
  entregada: { label: "Entregada", variant: "success" },
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
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
