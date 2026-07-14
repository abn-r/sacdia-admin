import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  AdminLocalField,
  LocalFieldListFilters,
  LocalFieldPayload,
} from "@/lib/catalogs/local-fields/types";

export async function listAdminLocalFields(filters: LocalFieldListFilters = {}) {
  const params: Record<string, number> = {};
  if (filters.unionId) params.unionId = filters.unionId;

  const payload = await apiRequest<unknown>("/admin/local-fields", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return unwrapApiData<AdminLocalField[]>(payload);
}

export async function createAdminLocalField(body: LocalFieldPayload) {
  const payload = await apiRequest<unknown>("/admin/local-fields", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminLocalField>(payload);
}

export async function updateAdminLocalField(
  localFieldId: number,
  body: Partial<LocalFieldPayload>,
) {
  const payload = await apiRequest<unknown>(`/admin/local-fields/${localFieldId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminLocalField>(payload);
}

export async function deleteAdminLocalField(localFieldId: number) {
  const payload = await apiRequest<unknown>(`/admin/local-fields/${localFieldId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminLocalField>(payload);
}
