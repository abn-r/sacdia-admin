import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/api/evidence-review";

const typeConfig: Record<
  EvidenceType,
  { label: string; className: string }
> = {
  folder: {
    label: "Carpeta",
    // Uses primary semantic token for a neutral-blue feel
    className: "bg-primary/10 text-primary border-primary/20",
  },
  class: {
    label: "Clase",
    // Uses secondary for a muted-accent distinction
    className: "bg-secondary text-secondary-foreground border-border",
  },
  honor: {
    label: "Honor",
    // Uses success variant colors via semantic tokens
    className:
      "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-400 dark:bg-green-600/15 dark:border-green-500/25",
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
