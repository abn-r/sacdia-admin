import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type CatalogRole = {
  role_id: string;
  name: string;
  role_category?: string;
};

export async function listCatalogRoles(category?: "CLUB" | "GLOBAL") {
  const params = category ? { category } : undefined;
  const payload = await apiRequest<unknown>("/catalogs/roles", { params });
  return unwrapApiData<CatalogRole[]>(payload);
}

export async function getCurrentEcclesiasticalYear() {
  const payload = await apiRequest<unknown>("/catalogs/ecclesiastical-years/current");
  return unwrapApiData<{ year_id: number; start_date?: string; end_date?: string }>(
    payload,
  );
}
