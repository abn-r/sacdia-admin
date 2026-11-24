import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Titled block of a detail tab. A plain heading, not a Card: content brings its own surface. */
export function SectionBlock({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="font-semibold text-base tracking-tight">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function FactList({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; muted?: boolean }>;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-0.5">
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd
            className={cn(
              "whitespace-pre-line break-words text-sm",
              item.muted ? "text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
