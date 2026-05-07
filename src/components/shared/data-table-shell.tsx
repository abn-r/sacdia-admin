import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type DataTableShellProps = HTMLAttributes<HTMLDivElement>;

export function DataTableShell({ className, ...props }: DataTableShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
