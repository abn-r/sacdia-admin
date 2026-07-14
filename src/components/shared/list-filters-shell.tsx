import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ListFiltersShellProps {
  title: string;
  hint?: string;
  children: ReactNode;
}

export function ListFiltersShell({ title, hint, children }: ListFiltersShellProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-end gap-4">{children}</div>
      </div>
    </div>
  );
}

interface ListFilterFieldProps {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}

export function ListFilterField({
  id,
  label,
  className,
  children,
}: ListFilterFieldProps) {
  return (
    <div className={cn("space-y-1", className ?? "w-[200px]")}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
