import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminDivision, DivisionPayload } from "@/lib/catalogs/divisions/types";

export async function listAdminDivisions() {
  const payload = await apiRequest<unknown>("/admin/divisions");
  return unwrapApiData<AdminDivision[]>(payload);
}

export async function createAdminDivision(body: DivisionPayload) {
  const payload = await apiRequest<unknown>("/admin/divisions", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminDivision>(payload);
}

export async function updateAdminDivision(divisionId: number, body: Partial<DivisionPayload>) {
  const payload = await apiRequest<unknown>(`/admin/divisions/${divisionId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminDivision>(payload);
}

export async function deleteAdminDivision(divisionId: number) {
  const payload = await apiRequest<unknown>(`/admin/divisions/${divisionId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminDivision>(payload);
}
