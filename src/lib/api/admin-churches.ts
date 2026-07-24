import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  AdminChurch,
  AdminChurchApi,
  ChurchListFilters,
  ChurchPayload,
} from "@/lib/catalogs/churches/types";
import { normalizeChurch } from "@/lib/catalogs/churches/types";

export async function listAdminChurches(filters: ChurchListFilters = {}) {
  const params: Record<string, number> = {};
  if (filters.districtId) params.districtId = filters.districtId;

  const payload = await apiRequest<unknown>("/admin/churches", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  const rows = unwrapApiData<AdminChurchApi[]>(payload);
  return rows.map(normalizeChurch);
}

export async function createAdminChurch(body: ChurchPayload) {
  const payload = await apiRequest<unknown>("/admin/churches", {
    method: "POST",
    body,
  });
  return normalizeChurch(unwrapApiData<AdminChurchApi>(payload));
}

export async function updateAdminChurch(churchId: number, body: Partial<ChurchPayload>) {
  const payload = await apiRequest<unknown>(`/admin/churches/${churchId}`, {
    method: "PATCH",
    body,
  });
  return normalizeChurch(unwrapApiData<AdminChurchApi>(payload));
}

export async function deleteAdminChurch(churchId: number) {
  const payload = await apiRequest<unknown>(`/admin/churches/${churchId}`, {
    method: "DELETE",
  });
  return normalizeChurch(unwrapApiData<AdminChurchApi>(payload));
}

export type { AdminChurch };
