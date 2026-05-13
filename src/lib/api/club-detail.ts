import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

export type AttendanceDataPoint = {
  year: number;
  week: number;
  avg_pct: number;
};

export type ScoreBreakdownItem = {
  label: string;
  value_pct: number;
  weight: number;
};

export type ClubScore = {
  value: number;
  grade: string;
  breakdown: ScoreBreakdownItem[];
};

export type UpcomingEvent = {
  activity_id: number;
  name: string;
  kind: string | null;
  activity_date: string | null;
  section_name: string | null;
};

export type ClubFunnel = {
  pending_requests: number;
  active_members: number;
  investidos_year: number;
};

export type ClubOverview = {
  attendance: AttendanceDataPoint[] | null;
  attendance_average: number | null;
  score: ClubScore;
  upcoming_events: UpcomingEvent[];
  funnel: ClubFunnel;
};

export type LeadershipMember = {
  assignment_id: string;
  user_id: string;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  user_image: string | null;
  email: string | null;
  role_name: string;
  section_name: string | null;
  start_date: string;
};

export type ClubLeadership = {
  director: LeadershipMember | null;
  deputies: LeadershipMember[];
  secretaries: LeadershipMember[];
  others: LeadershipMember[];
};

function unwrap<T>(payload: unknown): T {
  const wrapped = payload as { data?: T } | T;
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "data" in (wrapped as Record<string, unknown>) &&
    (wrapped as { data?: T }).data
  ) {
    return (wrapped as { data: T }).data;
  }
  return wrapped as T;
}

export async function getClubOverview(clubId: number): Promise<ClubOverview> {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/overview`);
  return unwrap<ClubOverview>(payload);
}

export async function getClubOverviewFromClient(
  clubId: number,
): Promise<ClubOverview> {
  const payload = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/overview`,
  );
  return unwrap<ClubOverview>(payload);
}

export async function getClubLeadership(clubId: number): Promise<ClubLeadership> {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/leadership`);
  return unwrap<ClubLeadership>(payload);
}

export async function getClubLeadershipFromClient(
  clubId: number,
): Promise<ClubLeadership> {
  const payload = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/leadership`,
  );
  return unwrap<ClubLeadership>(payload);
}
