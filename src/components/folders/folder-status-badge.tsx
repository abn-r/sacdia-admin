import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FolderActiveStatus = "active" | "inactive";

const statusConfig: Record<FolderActiveStatus, { label: string; variant: "success" | "secondary" }> = {
  active: { label: "Activa", variant: "success" },
  inactive: { label: "Inactiva", variant: "secondary" },
};

interface FolderStatusBadgeProps {
  active: boolean;
  className?: string;
}

export function FolderStatusBadge({ active, className }: FolderStatusBadgeProps) {
  const key: FolderActiveStatus = active ? "active" : "inactive";
  const config = statusConfig[key];

  return (
    <Badge variant={config.variant} className={cn("text-xs", className)}>
      {config.label}
    </Badge>
  );
}
