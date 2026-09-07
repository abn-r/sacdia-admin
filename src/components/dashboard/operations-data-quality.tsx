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
    <details className="rounded-2xl bg-card ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
        <Info className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">· {description}</span>
      </summary>
      <ul className="grid gap-2 border-t px-4 py-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.metric} className="rounded-xl border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">{entry.metric}</span>
              <Badge variant={qualityBadgeVariant(entry.status)}>
                {statusLabels[entry.status]}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground text-sm">{entry.note}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
