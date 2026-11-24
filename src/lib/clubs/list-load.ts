import { apiRequest } from "@/lib/api/client";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { extractItems, extractMeta } from "@/lib/phase-e-catalogs/fetch-helpers";
import {
  buildClubsListParams,
  type ClubListItem,
  type ClubsListMeta,
  type ClubsListQuery,
} from "@/lib/clubs/fetch-list";

export type ClubsListLoad =
  | { ok: true; items: ClubListItem[]; meta: ClubsListMeta }
  | { ok: false; error: ErrorStateFromError };

/**
 * Same request as `fetchClubsList`, but a failure keeps its kind (403, 429,
 * offline, 5xx) so the list can show the matching `ErrorState` instead of a
 * bare message. A failure is never returned as an empty list.
 */
export async function loadClubsList(query: ClubsListQuery): Promise<ClubsListLoad> {
  try {
    const params = buildClubsListParams(query);
    const payload = await apiRequest<unknown>(`/clubs?${params.toString()}`);
    const items = extractItems(payload) as ClubListItem[];
    const meta = extractMeta(payload, query.page, query.limit, items.length);
    return { ok: true, items, meta };
  } catch (error) {
    return { ok: false, error: errorStateFromError(error) };
  }
}
