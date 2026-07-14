import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminUnion, UnionListFilters, UnionPayload } from "@/lib/catalogs/unions/types";

export async function listAdminUnions(filters: UnionListFilters = {}) {
  const params: Record<string, number> = {};
  if (filters.countryId) params.countryId = filters.countryId;
  if (filters.divisionId) params.divisionId = filters.divisionId;

  const payload = await apiRequest<unknown>("/admin/unions", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return unwrapApiData<AdminUnion[]>(payload);
}

export async function createAdminUnion(body: UnionPayload) {
  const payload = await apiRequest<unknown>("/admin/unions", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminUnion>(payload);
}

export async function updateAdminUnion(unionId: number, body: Partial<UnionPayload>) {
  const payload = await apiRequest<unknown>(`/admin/unions/${unionId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminUnion>(payload);
}

export async function deleteAdminUnion(unionId: number) {
  const payload = await apiRequest<unknown>(`/admin/unions/${unionId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminUnion>(payload);
}
