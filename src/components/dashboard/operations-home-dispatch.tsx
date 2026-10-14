import Link from "next/link";
import type { ComponentProps } from "react";
import { OperationsDataQuality } from "@/components/dashboard/operations-data-quality";
import {
  OperationsPeriodContext,
  type OperationsPeriodContextProps,
} from "@/components/dashboard/operations-period-context";
import {
  OperationsWorkQueue,
  type OperationsWorkQueueProps,
} from "@/components/dashboard/operations-work-queue";
import { cn } from "@/lib/utils";

export type LaggingClubRow = {
  key: string;
  name: string;
  href: string;
  reasons: Array<{ label: string; tone: "danger" | "muted" }>;
};

export interface DispatchHomeProps {
  /** Must include `empty`: dispatch always shows the queue block. */
  queue: OperationsWorkQueueProps & { empty: NonNullable<OperationsWorkQueueProps["empty"]> };
  lagging: { headingId: string; title: string; rows: LaggingClubRow[] };
  summary: string;
  context: OperationsPeriodContextProps;
  dataQuality: ComponentProps<typeof OperationsDataQuality>;
}

export function DispatchHome({ queue, lagging, summary, context, dataQuality }: DispatchHomeProps) {
  return (
    <div className="flex flex-col gap-8">
      <OperationsWorkQueue {...queue} />
      {lagging.rows.length > 0 ? (
        <section aria-labelledby={lagging.headingId} className="space-y-3">
          <h2 id={lagging.headingId} className="font-semibold text-base tracking-tight">
            {lagging.title}
          </h2>
          <ul className="divide-y divide-border rounded-xl border bg-card">
            {lagging.rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={row.href} className="font-medium text-primary hover:underline">
                  {row.name}
                </Link>
                <span className="flex flex-wrap justify-end gap-x-3">
                  {row.reasons.map((reason) => (
                    <span
                      key={reason.label}
                      className={cn(
                        reason.tone === "danger" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {reason.label}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {summary ? <p className="text-sm">{summary}</p> : null}
      <OperationsPeriodContext {...context} />
      <OperationsDataQuality {...dataQuality} />
    </div>
  );
}
