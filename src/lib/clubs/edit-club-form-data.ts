import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { clubLocationName } from "@/components/clubs/detail/location";
import { fetchClubById } from "@/lib/clubs/fetch-detail";
import { resolveClubId } from "@/lib/clubs/types";

export type EditClubFormData = {
  clubId: number;
  name: string;
  description: string;
  address: string;
  active: boolean;
  lat: number | null;
  lng: number | null;
  /** Read-only context: these three are not editable through PATCH /clubs/:id. */
  localField?: string;
  district?: string;
  church?: string;
  googleMapsApiKey: string;
  googleMapsMapId?: string;
};

function finiteOrNull(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

/**
 * Props for `EditClubForm`, shared by the full page and the intercepted modal.
 * Returns `null` when the actor cannot edit clubs (`clubs.update`, as the API)
 * or the club does not exist / is out of the actor's scope.
 */
export async function loadEditClubFormData(
  user: AuthUser,
  rawId: string,
): Promise<EditClubFormData | null> {
  if (!canCapability(user, "clubs", "update")) {
    return null;
  }

  const clubId = Number(rawId);
  if (!Number.isInteger(clubId) || clubId <= 0) {
    return null;
  }

  const club = await fetchClubById(clubId);
  if (!club) {
    return null;
  }

  return {
    clubId: resolveClubId(club, clubId),
    name: club.name?.trim() ?? "",
    description: club.description?.trim() ?? "",
    address: club.address?.trim() ?? "",
    active: club.active !== false,
    lat: finiteOrNull(club.coordinates?.lat),
    lng: finiteOrNull(club.coordinates?.lng),
    localField: clubLocationName(club.local_field, club.local_fields),
    district: clubLocationName(club.district, club.districts),
    church: clubLocationName(club.church, club.churches),
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    googleMapsMapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  };
}
