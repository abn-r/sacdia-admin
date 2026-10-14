import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OperationsDashboardDataQuality } from "@/lib/api/operations-dashboard";

function qualityBadgeVariant(
  status: OperationsDashboardDataQuality["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "exact":
      return "default";
    case "current_affiliation":
      return "secondary";
    case "not_applicable":
      return "outline";
    case "unavailable":
      return "destructive";
    default:
      return "outline";
  }
}

interface OperationsDataQualityProps {
  title: string;
  description: string;
  entries: OperationsDashboardDataQuality[];
  statusLabels: Record<OperationsDashboardDataQuality["status"], string>;
}

export function OperationsDataQuality({
  title,
  description,
  entries,
  statusLabels,
}: OperationsDataQualityProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="text-muted-foreground text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <Info className="size-3.5" aria-hidden />
        <span>{title}</span>
      </summary>
      <p className="mt-2">{description}</p>
      <ul className="mt-2 space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.metric} className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{entry.metric}</span>
            <Badge variant={qualityBadgeVariant(entry.status)}>{statusLabels[entry.status]}</Badge>
            <span>{entry.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
