import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminClubType, ClubTypePayload } from "@/lib/catalogs/club-types/types";

export type { AdminClubType };

export async function listAdminClubTypes() {
  const payload = await apiRequest<unknown>("/admin/club-types");
  return unwrapApiData<AdminClubType[]>(payload);
}

export async function createAdminClubType(body: ClubTypePayload) {
  const payload = await apiRequest<unknown>("/admin/club-types", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminClubType>(payload);
}

export async function updateAdminClubType(
  clubTypeId: number,
  body: Partial<ClubTypePayload>,
) {
  const payload = await apiRequest<unknown>(`/admin/club-types/${clubTypeId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminClubType>(payload);
}

export async function deleteAdminClubType(clubTypeId: number) {
  const payload = await apiRequest<unknown>(`/admin/club-types/${clubTypeId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminClubType>(payload);
}
