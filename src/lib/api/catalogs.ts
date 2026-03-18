import { apiRequest } from "@/lib/api/client";

export type ClubType = {
  club_type_id: number;
  name: string;
  description?: string;
};

export type EcclesiasticalYear = {
  ecclesiastical_year_id: number;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
};

export async function listClubTypes() {
  return apiRequest<ClubType[]>("/catalogs/club-types");
}

export async function listEcclesiasticalYears(active?: boolean) {
  const params = new URLSearchParams();
  if (active !== undefined) {
    params.set("active", String(active));
  }

  return apiRequest<EcclesiasticalYear[]>(
    `/catalogs/ecclesiastical-years${params.toString() ? `?${params.toString()}` : ""}`,
  );
}
