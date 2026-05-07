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

export async function listEcclesiasticalYears(active?: boolean) {
  const params = new URLSearchParams();
  if (active !== undefined) {
    params.set("active", String(active));
  }

  return apiRequest<EcclesiasticalYear[]>(
    `/catalogs/ecclesiastical-years${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

/**
 * Returns the ecclesiastical_year_id of the currently active year, or the most
 * recent one by start_date if no year is flagged active. Returns null if the
 * endpoint fails or the catalog is empty — callers should render an empty state
 * in that case rather than passing a guessed numeric default.
 */
export async function getActiveEcclesiasticalYearId(): Promise<number | null> {
  try {
    const activeYears = await listEcclesiasticalYears(true);
    if (activeYears.length > 0) {
      return activeYears[0].ecclesiastical_year_id;
    }

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
