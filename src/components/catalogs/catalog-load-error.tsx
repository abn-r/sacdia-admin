import { CatalogPageHeader } from "@/components/catalogs/catalog-page-header";
import { ErrorState } from "@/components/shared/error-state";
import type { CatalogLoadFailure } from "@/lib/catalogs/load-failure";

interface CatalogLoadErrorProps {
  title: string;
  description?: string;
  failure: CatalogLoadFailure;
}

/**
 * Catalog list that failed to load. Keeps the catalog heading and replaces the
 * list AND the create button with the failure state, so a 429 never reads as an
 * empty catalog. A 429 is shown as "too many requests" (clock, retry, no copy
 * detail); other kinds follow `ErrorState`.
 */
export function CatalogLoadError({ title, description, failure }: CatalogLoadErrorProps) {
  return (
    <div className="space-y-4">
      <CatalogPageHeader title={title} {...(description ? { description } : {})} />
      <ErrorState
        kind={failure.kind}
        retry
        {...(failure.detail ? { detail: failure.detail } : {})}
      />
    </div>
  );
}
