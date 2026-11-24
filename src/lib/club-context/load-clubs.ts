import { apiRequest, ApiError } from "@/lib/api/client";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import { normalizeFinanceClubSections } from "@/lib/finances/club-sections";
import type { ClubContextClub } from "./types";

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

export type LoadClubsResult =
  | { ok: true; clubs: ClubContextClub[] }
  | { ok: false; error: unknown; message: string | null };

/**
 * Clubs the actor can see (`GET /clubs` is already scoped by the backend) with
 * their active sections, shaped for the shared club context bar.
 */
export async function loadClubContextClubs(
  clubTypes: ClubType[],
  localFields: LocalField[] = [],
): Promise<LoadClubsResult> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    const groupById = new Map(localFields.map((lf) => [lf.local_field_id, lf.name]));
    const clubs = extractArray(payload)
      .filter((club) => club.active !== false)
      .map((club): ClubContextClub => {
        const localFieldId = Number(club.local_field_id ?? 0);
        return {
          club_id: Number(club.club_id ?? club.id),
          name: String(club.name ?? `Club ${club.club_id ?? club.id}`),
          local_field_id: localFieldId > 0 ? localFieldId : undefined,
          group: localFieldId > 0 ? groupById.get(localFieldId) : undefined,
          sections: normalizeFinanceClubSections(club, clubTypes),
        };
      })
      .filter((club) => club.club_id > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return { ok: true, clubs };
  } catch (error) {
    return { ok: false, error, message: error instanceof ApiError ? error.message : null };
  }
}
