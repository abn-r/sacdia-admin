import { apiRequest, ApiError } from "@/lib/api/client";
import { extractItems, extractMeta } from "@/lib/phase-e-catalogs/fetch-helpers";

export type ClubListItem = {
  club_id?: number;
  id?: number;
  name?: string;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  local_field?: { name?: string } | null;
  local_fields?: { name?: string } | null;
  district?: { name?: string } | null;
  districts?: { name?: string } | null;
  church?: { name?: string } | null;
  churches?: { name?: string } | null;
  club_sections?: Array<{ club_section_id?: number; active?: boolean }>;
  [key: string]: unknown;
};

export type ClubsListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ClubsListQuery = {
  page: number;
  limit: number;
  search?: string;
  active?: boolean;
  localFieldId?: number;
};

export type ClubsListResult = {
  items: ClubListItem[];
  meta: ClubsListMeta;
  available: boolean;
  error?: string;
};

export function getClubListId(club: ClubListItem): number | null {
  const id = club.club_id ?? club.id;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

export function getClubLocalFieldName(club: ClubListItem): string | null {
  return club.local_field?.name ?? club.local_fields?.name ?? null;
}

export function getClubDistrictName(club: ClubListItem): string | null {
  return club.district?.name ?? club.districts?.name ?? null;
}

export function getClubChurchName(club: ClubListItem): string | null {
  return club.church?.name ?? club.churches?.name ?? null;
}

function filterItemsBySearch(items: ClubListItem[], search?: string) {
  const needle = search?.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((club) => {
    const haystack = [
      club.name,
      getClubLocalFieldName(club),
      getClubDistrictName(club),
      getClubChurchName(club),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export async function fetchClubsList(query: ClubsListQuery): Promise<ClubsListResult> {
  const fallbackMeta: ClubsListMeta = {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 1,
  };

  try {
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
    });
    if (query.active === true) params.set("active", "true");
    if (query.active === false) params.set("active", "false");
    if (query.localFieldId) params.set("localFieldId", String(query.localFieldId));

    const payload = await apiRequest<unknown>(`/clubs?${params.toString()}`);
    let items = extractItems(payload) as ClubListItem[];
    const meta = extractMeta(payload, query.page, query.limit, items.length);
    items = filterItemsBySearch(items, query.search);

    return { items, meta, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { items: [], meta: fallbackMeta, available: false, error: error.message };
    }
    return { items: [], meta: fallbackMeta, available: false, error: "UNEXPECTED" };
  }
}
