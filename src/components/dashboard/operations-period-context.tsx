import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatRow = { label: string; value: string; tone?: "default" | "warning" };

type ContextGroup = {
  title: string;
  description?: string;
  rows?: StatRow[];
  action?: { href: string; label: string };
  children?: ReactNode;
};

export interface OperationsPeriodContextProps {
  headingId: string;
  title: string;
  groups: ContextGroup[];
}

function StatRowView({ label, value, tone = "default" }: StatRow) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span
        className={cn("shrink-0 font-medium tabular-nums", tone === "warning" && "text-destructive")}
      >
        {value}
      </span>
    </div>
  );
}

export function OperationsPeriodContext({ headingId, title, groups }: OperationsPeriodContextProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="font-semibold text-base tracking-tight">
        {title}
      </h2>
      <Card size="sm">
        <CardContent className="grid gap-6 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="space-y-1">
                <h3 className="font-medium text-sm">{group.title}</h3>
                {group.description ? (
                  <p className="text-muted-foreground text-xs">{group.description}</p>
                ) : null}
              </div>
              {group.rows?.map((row) => <StatRowView key={row.label} {...row} />)}
              {group.children}
              {group.action ? (
                <Link
                  href={group.action.href}
                  className="inline-block text-primary text-sm hover:underline"
                >
                  {group.action.label}
                </Link>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
