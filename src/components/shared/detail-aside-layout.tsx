import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DetailAsideLayoutProps {
  aside: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Two columns (300px aside + content) from lg; stacked below. */
export function DetailAsideLayout({ aside, children, className }: DetailAsideLayoutProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start", className)}>
      <aside className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">{aside}</aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
