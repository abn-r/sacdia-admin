import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  AdminClubIdeal,
  ClubIdealPayload,
  ClubIdealUpdatePayload,
} from "@/lib/catalogs/club-ideals/types";

export async function listAdminClubIdeals() {
  const payload = await apiRequest<unknown>("/admin/club-ideals");
  return unwrapApiData<AdminClubIdeal[]>(payload);
}

export async function createAdminClubIdeal(body: ClubIdealPayload) {
  const payload = await apiRequest<unknown>("/admin/club-ideals", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminClubIdeal>(payload);
}

export async function updateAdminClubIdeal(
  clubIdealId: number,
  body: ClubIdealUpdatePayload,
) {
  const payload = await apiRequest<unknown>(`/admin/club-ideals/${clubIdealId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminClubIdeal>(payload);
}

export async function deleteAdminClubIdeal(clubIdealId: number) {
  const payload = await apiRequest<unknown>(`/admin/club-ideals/${clubIdealId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminClubIdeal>(payload);
}
