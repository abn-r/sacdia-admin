import { Info } from "lucide-react";
import type { OperationsDashboardDataQuality } from "@/lib/api/operations-dashboard";

export interface OperationsDataQualityProps {
  title: string;
  description: string;
  entries: OperationsDashboardDataQuality[];
  statusLabels: Record<OperationsDashboardDataQuality["status"], string>;
}

/** Collapsed footnote with the contract notes for each metric family. */
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
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <Info className="size-3.5" aria-hidden />
        <span>{title}</span>
      </summary>
      <p className="mt-2">{description}</p>
      <ul className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li key={entry.metric}>
            <span className="font-medium text-foreground">{entry.metric}</span>
            {" · "}
            {statusLabels[entry.status]}
            {entry.note ? ` · ${entry.note}` : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
