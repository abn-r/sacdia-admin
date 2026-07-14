import { apiRequest } from "@/lib/api/client";

export type UserHonorRecord = {
  user_honor_id: number;
  user_id: string;
  honor_id: number;
  active: boolean;
  validate: boolean;
  validation_status: string;
  completion_mode: string;
  submitted_at: string | null;
  validated_at: string | null;
  date: string;
  created_at: string | null;
  honors: {
    honor_id: number;
    name: string;
    honor_image: string | null;
    club_type_id: number;
    skill_level: string | null;
    club_types: { name: string } | null;
    honors_categories: {
      honor_category_id: number;
      name: string;
      icon: string | null;
    } | null;
  } | null;
};

export type UserClassEnrollment = {
  enrollment_id: number;
  user_id: string;
  class_id: number;
  ecclesiastical_year_id: number;
  enrollment_date: string;
  investiture_status: string;
  investiture_date: string | null;
  validated_at: string | null;
  active: boolean;
  overall_progress?: number;
  classes: {
    class_id: number;
    name: string;
    description: string | null;
    asset_code: string | null;
    club_types: { name: string } | null;
  } | null;
  ecclesiastical_year: {
    start_date: string;
    end_date: string;
  } | null;
};

export async function getUserHonors(userId: string): Promise<UserHonorRecord[]> {
  const payload = await apiRequest<UserHonorRecord[] | { data: UserHonorRecord[] }>(
    `/users/${encodeURIComponent(userId)}/honors`,
  );
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function getUserClassEnrollments(
  userId: string,
): Promise<UserClassEnrollment[]> {
  const payload = await apiRequest<
    UserClassEnrollment[] | { data: UserClassEnrollment[] }
  >(`/users/${encodeURIComponent(userId)}/classes`);

  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}
