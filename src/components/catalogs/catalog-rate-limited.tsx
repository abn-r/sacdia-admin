import { PageHeader, type PageHeaderBreadcrumb } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";

interface CatalogRateLimitedProps {
  title: string;
  description?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
}

/**
 * Catalog list that failed with 429: keeps the page header, replaces the list
 * (and the create button) with a rate-limit state that retries the route.
 */
export function CatalogRateLimited({ title, description, breadcrumbs }: CatalogRateLimitedProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        {...(description ? { description } : {})}
        {...(breadcrumbs ? { breadcrumbs } : {})}
      />
      <ErrorState kind="rateLimited" retry />
    </div>
  );
}
