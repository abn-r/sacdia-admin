"use client";

import { useState } from "react";
import Link from "next/link";
import { OperationsMeter } from "@/components/dashboard/operations-meter";
import { Button } from "@/components/ui/button";
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
  /** "Ver todos (N)"; shown when there are more rows than the cap. */
  showAllLabel?: string;
  showLessLabel?: string;
}

/** Rows visible before the "show all" toggle. */
export const GAP_TABLE_VISIBLE_ROWS = 8;

function MetricCell({ metric, label }: { metric: OperationsGapMetric; label: string }) {
  return (
    <TableCell className="max-sm:block max-sm:flex-1 max-sm:p-0 max-sm:pt-1">
      <span className="flex items-center justify-end gap-3 max-sm:justify-start">
        <span className="text-muted-foreground text-xs sm:hidden">{label}</span>
        <OperationsMeter pct={metric.pct} className="hidden w-16 sm:block xl:w-20" />
        <span className="min-w-10 text-right tabular-nums max-sm:min-w-0 max-sm:font-medium">
          {metric.label}
        </span>
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
  showAllLabel,
  showLessLabel,
}: OperationsGapTableProps) {
  const [expanded, setExpanded] = useState(false);
  const capped = rows.length > GAP_TABLE_VISIBLE_ROWS;
  const visible = capped && !expanded ? rows.slice(0, GAP_TABLE_VISIBLE_ROWS) : rows;
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
          <Table className="max-sm:block">
            <TableHeader className="max-sm:hidden">
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
            <TableBody className="max-sm:block">
              {visible.map((row) => (
                <TableRow
                  key={row.key}
                  className="max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-4 max-sm:px-3 max-sm:py-2.5"
                >
                  <TableCell className="max-w-56 whitespace-normal max-sm:block max-sm:w-full max-sm:max-w-none max-sm:p-0">
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <MetricCell metric={row.reports} label={columns.reports} />
                  <MetricCell metric={row.operational} label={columns.operational} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {capped && showAllLabel ? (
            <div className="border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (showLessLabel ?? showAllLabel) : showAllLabel}
              </Button>
            </div>
          ) : null}
        </DataTableShell>
      )}
    </section>
  );
}
