import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  AdminDistrictApi,
  DistrictListFilters,
  DistrictPayload,
} from "@/lib/catalogs/districts/types";
import { normalizeDistrict } from "@/lib/catalogs/districts/types";

export async function listAdminDistricts(filters: DistrictListFilters = {}) {
  const params: Record<string, number> = {};
  if (filters.localFieldId) params.localFieldId = filters.localFieldId;

  const payload = await apiRequest<unknown>("/admin/districts", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  const rows = unwrapApiData<AdminDistrictApi[]>(payload);
  return rows.map(normalizeDistrict);
}

export async function createAdminDistrict(body: DistrictPayload) {
  const payload = await apiRequest<unknown>("/admin/districts", {
    method: "POST",
    body,
  });
  return normalizeDistrict(unwrapApiData<AdminDistrictApi>(payload));
}

export async function updateAdminDistrict(districtId: number, body: Partial<DistrictPayload>) {
  const payload = await apiRequest<unknown>(`/admin/districts/${districtId}`, {
    method: "PATCH",
    body,
  });
  return normalizeDistrict(unwrapApiData<AdminDistrictApi>(payload));
}

export async function deleteAdminDistrict(districtId: number) {
  const payload = await apiRequest<unknown>(`/admin/districts/${districtId}`, {
    method: "DELETE",
  });
  return normalizeDistrict(unwrapApiData<AdminDistrictApi>(payload));
}
