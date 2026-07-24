import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminCountry, CountryPayload } from "@/lib/catalogs/countries/types";

export async function listAdminCountries() {
  const payload = await apiRequest<unknown>("/admin/countries");
  return unwrapApiData<AdminCountry[]>(payload);
}

export async function createAdminCountry(body: CountryPayload) {
  const payload = await apiRequest<unknown>("/admin/countries", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminCountry>(payload);
}

export async function updateAdminCountry(countryId: number, body: Partial<CountryPayload>) {
  const payload = await apiRequest<unknown>(`/admin/countries/${countryId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminCountry>(payload);
}

export async function deleteAdminCountry(countryId: number) {
  const payload = await apiRequest<unknown>(`/admin/countries/${countryId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminCountry>(payload);
}
