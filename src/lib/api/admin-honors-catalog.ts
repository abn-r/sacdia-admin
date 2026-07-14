import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminHonor, HonorPayload } from "@/lib/catalogs/honors/types";

export async function listAdminHonorsCatalog() {
  const payload = await apiRequest<unknown>("/admin/honors-catalog");
  return unwrapApiData<AdminHonor[]>(payload);
}

export async function createAdminHonor(body: HonorPayload) {
  const payload = await apiRequest<unknown>("/admin/honors-catalog", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminHonor>(payload);
}

export async function updateAdminHonor(honorId: number, body: Partial<HonorPayload>) {
  const payload = await apiRequest<unknown>(`/admin/honors-catalog/${honorId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminHonor>(payload);
}

export async function deleteAdminHonor(honorId: number) {
  const payload = await apiRequest<unknown>(`/admin/honors-catalog/${honorId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminHonor>(payload);
}
