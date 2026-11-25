import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";

/** A failed catalog list load, mapped to the `ErrorState` kind that describes it. */
export type CatalogLoadFailure = ErrorStateFromError;

/**
 * One mapping for the 24 catalogs: 401/403 forbidden, 404 notFound, 429
 * rateLimited (a clock, not a failure), network offline, anything else a generic
 * error carrying the status. A failed load is never rendered as an empty list.
 */
export function catalogLoadFailure(error: unknown): CatalogLoadFailure {
  return errorStateFromError(error);
}

/**
 * The create button only appears over a list that actually loaded: after a 429
 * (or any failure) "create" next to an invisible list would invite duplicates.
 */
export function canShowCatalogCreate(opts: {
  canCreate: boolean;
  failure: CatalogLoadFailure | null;
}): boolean {
  return opts.canCreate && opts.failure === null;
}
