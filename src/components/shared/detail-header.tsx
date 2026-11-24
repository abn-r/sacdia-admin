import type { ReactNode } from "react";
import { PageHeader, type PageHeaderBreadcrumb } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export interface DetailHeaderFact {
  label: string;
  value: ReactNode;
}

export interface DetailHeaderProps {
  breadcrumbs?: PageHeaderBreadcrumb[];
  /** Logo or avatar (rendered in a 56px box). */
  media?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  facts?: DetailHeaderFact[];
  actions?: ReactNode;
  className?: string;
}

export function DetailHeader({ breadcrumbs, media, title, subtitle, facts, actions, className }: DetailHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <PageHeader breadcrumbs={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {media && (
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl">{media}</div>
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
            {facts && facts.length > 0 && (
              <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm">
                {facts.map((fact, idx) => (
                  <div key={`${fact.label}-${idx}`} className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <span aria-hidden className="text-muted-foreground">
                        ·
                      </span>
                    )}
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
