import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/api/evidence-review";

const typeConfig: Record<EvidenceType, { label: string; className: string }> = {
  folder: {
    label: "Carpeta",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  class: {
    label: "Clase",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  honor: {
    label: "Honor",
    className: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
};

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  className?: string;
}

export function EvidenceTypeBadge({ type, className }: EvidenceTypeBadgeProps) {
  const config = typeConfig[type] ?? {
    label: type,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
