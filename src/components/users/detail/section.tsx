import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionProps {
  num?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DetailSection({ num, title, action, children, className }: SectionProps) {
  return (
    <Card className={cn("gap-4 py-5", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-6 pb-0">
        <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {num ? (
            <span className="font-mono text-muted-foreground/70">{num}</span>
          ) : null}
          {title}
        </h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface FieldProps {
  k: string;
  v?: ReactNode;
  muted?: boolean;
  className?: string;
}

export function DetailField({ k, v, muted, className }: FieldProps) {
  const hasValue = v !== null && v !== undefined && v !== "" && v !== "—";
  return (
    <div
      className={cn(
        "border-b border-dashed border-border/70 py-2.5 last:border-b-0",
        className,
      )}
    >
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {k}
      </div>
      <div
        className={cn(
          "text-sm font-medium",
          muted || !hasValue
            ? "italic font-normal text-muted-foreground/70"
            : "text-foreground",
        )}
      >
        {hasValue ? v : "—"}
      </div>
    </div>
  );
}

export function DetailCols2({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-x-6 gap-y-0 sm:grid-cols-2", className)}>{children}</div>;
}
