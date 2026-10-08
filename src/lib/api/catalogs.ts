import { apiRequest } from "@/lib/api/client";

export type ClubType = {
  club_type_id: number;
  name: string;
  description?: string;
};

export type EcclesiasticalYear = {
  ecclesiastical_year_id: number;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
};

export async function listClubTypes() {
  return apiRequest<ClubType[]>("/catalogs/club-types");
}

export async function listEcclesiasticalYears() {
  return apiRequest<EcclesiasticalYear[]>("/catalogs/ecclesiastical-years");
}

/**
 * Returns the ecclesiastical_year_id of the year in force today, resolved from
 * GET /catalogs/ecclesiastical-years/current (the backend picks the year whose
 * date range contains today; it answers 200 with an empty body when none does).
 * The plain list endpoint takes no `active` filter, so it is only a fallback:
 * the most recent year by start_date. Returns null if everything fails or the
 * catalog is empty — callers should render an empty state in that case rather
 * than passing a guessed numeric default.
 */
export async function getActiveEcclesiasticalYearId(): Promise<number | null> {
  try {
    const current = await apiRequest<EcclesiasticalYear | null>(
      "/catalogs/ecclesiastical-years/current",
    );
    if (typeof current?.ecclesiastical_year_id === "number") {
      return current.ecclesiastical_year_id;
    }
  } catch {
    // fall through to the list-based fallback
  }

  try {
    const allYears = await listEcclesiasticalYears();
    if (allYears.length === 0) return null;

    const sorted = [...allYears].sort((a, b) =>
      b.start_date.localeCompare(a.start_date),
    );
    return sorted[0].ecclesiastical_year_id;
  } catch {
    return null;
  }
}
