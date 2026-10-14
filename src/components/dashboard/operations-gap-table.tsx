import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export type OperationsGapRow = {
  key: string;
  name: string;
  href: string;
  /** Coverage already formatted ("40%") or "—" without a closed month. */
  reports: string;
  /** "faltan 6" when sections are missing; absent otherwise. */
  missingLabel?: string;
  nonOperational: string;
  pending: string;
  hasGap: boolean;
};

export interface OperationsGapTableProps {
  headingId: string;
  title: string;
  description: string;
  columns: { name: string; reports: string; nonOperational: string; pending: string };
  empty: { title: string; description: string };
  /** Already ranked by gap. */
  rows: OperationsGapRow[];
}

export function OperationsGapTable({
  headingId,
  title,
  description,
  columns,
  empty,
  rows,
}: OperationsGapTableProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="space-y-1">
        <h2 id={headingId} className="font-semibold text-base tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={MapPin} title={empty.title} description={empty.description} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  {columns.name}
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  {columns.reports}
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  {columns.nonOperational}
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  {columns.pending}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} className={cn(!row.hasGap && "text-muted-foreground")}>
                  <TableCell>
                    <Link
                      href={row.href}
                      className={cn("font-medium hover:underline", row.hasGap && "text-primary")}
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.reports}
                    {row.missingLabel ? (
                      <>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-destructive">{row.missingLabel}</span>
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.nonOperational}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.pending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
