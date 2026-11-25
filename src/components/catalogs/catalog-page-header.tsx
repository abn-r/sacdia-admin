import type { ReactNode } from "react";

import type { PageHeaderBreadcrumb } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export interface CatalogPageHeaderProps {
  title: string;
  description?: string;
  /** Accepted for drop-in compatibility with PageHeader; the rail already gives the context. */
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Heading of the content pane next to the catalogs rail. The page-level h1
 * ("Catálogos") lives in the layout, so the selected catalog is an h2 with its
 * primary action on the right.
 */
export function CatalogPageHeader({
  title,
  description,
  actions,
  children,
  className,
}: CatalogPageHeaderProps) {
  const rightSlot = actions ?? children;
  return (
    <header
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <div className="min-w-0 space-y-0.5">
        <h2 className="font-semibold text-lg text-foreground tracking-tight">{title}</h2>
        {description ? <p className="max-w-prose text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{rightSlot}</div> : null}
    </header>
  );
}
