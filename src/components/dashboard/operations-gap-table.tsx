import Link from "next/link";
import { OperationsMeter } from "@/components/dashboard/operations-meter";
import { DataTableShell } from "@/components/shared/data-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OperationsGapMetric = {
  /** Drives the bar; `null` draws an empty track. */
  pct: number | null;
  /** Already formatted ("40%", "3/5" or "—"). */
  label: string;
};

export type OperationsGapRow = {
  key: string;
  name: string;
  href: string;
  reports: OperationsGapMetric;
  operational: OperationsGapMetric;
};

export interface OperationsGapTableProps {
  headingId: string;
  title: string;
  description: string;
  columns: { name: string; reports: string; operational: string };
  emptyLabel: string;
  /** Already ranked by gap. */
  rows: OperationsGapRow[];
}

function MetricCell({ metric }: { metric: OperationsGapMetric }) {
  return (
    <TableCell>
      <span className="flex items-center justify-end gap-3">
        <OperationsMeter pct={metric.pct} className="hidden w-16 sm:block xl:w-20" />
        <span className="min-w-10 text-right tabular-nums">{metric.label}</span>
      </span>
    </TableCell>
  );
}

export function OperationsGapTable({
  headingId,
  title,
  description,
  columns,
  emptyLabel,
  rows,
}: OperationsGapTableProps) {
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="space-y-0.5">
        <h2 id={headingId} className="font-semibold text-base tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-muted-foreground text-sm shadow-card">
          {emptyLabel}
        </p>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  {columns.name}
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  {columns.reports}
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  {columns.operational}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="max-w-56 whitespace-normal">
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <MetricCell metric={row.reports} />
                  <MetricCell metric={row.operational} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </section>
  );
}
