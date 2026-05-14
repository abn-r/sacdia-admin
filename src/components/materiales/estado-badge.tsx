import { Badge } from "@/components/ui/badge";
import type { MaterialEstado } from "@/lib/types/materiales";

const ESTADO_CONFIG: Record<
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

interface EstadoBadgeProps {
  estado: MaterialEstado;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    variant: "outline" as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
