import { useTranslations } from "next-intl";
import { StatusBadge as SystemStatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { MaterialEstado } from "@/lib/types/materials";

const STATUS_INTENT: Record<MaterialEstado, StatusIntent> = {
  en_revision: "warning",
  aprobada: "info",
  pagada: "success",
  entregada: "success",
  cancelada: "neutral",
};

interface StatusBadgeProps {
  estado: MaterialEstado;
  className?: string;
}

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const t = useTranslations("materials.pages.inbox.statusOptions");
  const intent = STATUS_INTENT[estado];

  return (
    <SystemStatusBadge
      intent={intent ?? "neutral"}
      label={intent ? t(estado) : estado}
      className={className}
    />
  );
}
