import { OperationsDataQuality } from "@/components/dashboard/operations-data-quality";
import {
  OperationsGapTable,
  type OperationsGapTableProps,
} from "@/components/dashboard/operations-gap-table";
import {
  OperationsPeriodContext,
  type OperationsPeriodContextProps,
} from "@/components/dashboard/operations-period-context";
import {
  OperationsWorkQueue,
  type OperationsWorkQueueProps,
} from "@/components/dashboard/operations-work-queue";
import type { ComponentProps } from "react";

export interface SupervisionHomeProps {
  /** Translated summary sentences joined with a space; may be empty. */
  summary: string;
  gapTable: OperationsGapTableProps;
  /** Rendered only when it has items (no empty state in supervision). */
  pending: Omit<OperationsWorkQueueProps, "empty">;
  context: OperationsPeriodContextProps;
  dataQuality: ComponentProps<typeof OperationsDataQuality>;
}

export function SupervisionHome({
  summary,
  gapTable,
  pending,
  context,
  dataQuality,
}: SupervisionHomeProps) {
  return (
    <div className="flex flex-col gap-8">
      {summary ? <p className="text-sm">{summary}</p> : null}
      <OperationsGapTable {...gapTable} />
      <OperationsWorkQueue {...pending} />
      <OperationsPeriodContext {...context} />
      <OperationsDataQuality {...dataQuality} />
    </div>
  );
}
