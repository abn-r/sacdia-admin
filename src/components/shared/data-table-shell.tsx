import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type DataTableShellProps = HTMLAttributes<HTMLDivElement>;

/**
 * Crisp frame for a data table. Horizontal scroll and its edge fade live in
 * `<Table>` itself, so the frame only clips the rounded corners.
 */
export function DataTableShell({ className, children, ...props }: DataTableShellProps) {
  return (
    <div
      data-slot="data-table-shell"
      className={cn(
        "overflow-hidden rounded-xl border border-transparent bg-card shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
