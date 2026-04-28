import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  children,
  actions,
  className,
}: PageHeaderProps) {
  const rightSlot = actions ?? children;

  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="size-3 opacity-50" aria-hidden />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : ( 
                  <span className={cn(isLast && "text-foreground/80")}>
                    {crumb.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {rightSlot && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
}
