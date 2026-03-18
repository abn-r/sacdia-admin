import { apiRequest } from "@/lib/api/client";

export type Country = {
  country_id: number;
  name: string;
  code?: string;
  active?: boolean;
};

export type Union = {
  union_id: number;
  name: string;
  country_id: number;
  active?: boolean;
};

export type LocalField = {
  local_field_id: number;
  name: string;
  union_id: number;
  active?: boolean;
};

export type District = {
  district_id: number;
  name: string;
  local_field_id: number;
  active?: boolean;
};

export type Church = {
  church_id: number;
  name: string;
  district_id: number;
  active?: boolean;
};

export async function listCountries() {
  return apiRequest<Country[]>("/catalogs/countries");
}

export async function listUnions(countryId?: number) {
  const params = new URLSearchParams();
  if (countryId) {
    params.set("countryId", String(countryId));
  }

  return apiRequest<Union[]>(`/catalogs/unions${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function listLocalFields(unionId?: number) {
  const params = new URLSearchParams();
  if (unionId) {
    params.set("unionId", String(unionId));
  }

  return apiRequest<LocalField[]>(`/catalogs/local-fields${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function listDistricts(localFieldId?: number) {
  const params = new URLSearchParams();
  if (localFieldId) {
    params.set("localFieldId", String(localFieldId));
  }

  return apiRequest<District[]>(`/catalogs/districts${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function listChurches(districtId?: number) {
  const params = new URLSearchParams();
  if (districtId) {
    params.set("districtId", String(districtId));
  }

  return apiRequest<Church[]>(`/catalogs/churches${params.toString() ? `?${params.toString()}` : ""}`);
}
