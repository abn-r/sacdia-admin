import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type AnnualReport = {
  annual_report_id: number;
  club_id: number;
  ecclesiastical_year_id: number;
  status?: string | null;
  created_at?: string | null;
  finalized_at?: string | null;
  ecclesiastical_year?: {
    year_id: number;
    start_date?: string;
    end_date?: string;
  } | null;
  finalized_by_user?: {
    user_id: string;
    name?: string | null;
    paternal_last_name?: string | null;
  } | null;
};

export type QuarterlyReport = {
  quarterly_report_id: number;
  club_id: number;
  ecclesiastical_year_id: number;
  quarter?: number | null;
  status?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
};

export async function listClubAnnualReports(clubId: number) {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/annual-reports`);
  return unwrapApiData<AnnualReport[]>(payload);
}

export async function listClubQuarterlyReports(clubId: number, year?: number) {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/quarterly-reports`, {
    params: year ? { year } : undefined,
  });
  return unwrapApiData<QuarterlyReport[]>(payload);
}
