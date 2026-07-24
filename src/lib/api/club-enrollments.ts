import { apiRequest } from "@/lib/api/client";

export type ClubEnrollmentStatus =
  | "pending_validation"
  | "active"
  | "rejected"
  | "inactive"
  | (string & {});

export type ClubEnrollment = {
  club_enrollment_id: string;
  club_section_id: number;
  ecclesiastical_year_id: number;
  status: ClubEnrollmentStatus;
  address?: string | null;
  meeting_days?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
};

type ApiEnvelope<T> = { status: string; data: T };

function unwrapApiData<T>(value: T | ApiEnvelope<T>): T {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    "status" in value
  ) {
    return (value as ApiEnvelope<T>).data;
  }

  return value as T;
}

function extractEnrollmentId(enrollment: ClubEnrollment | null): string | null {
  if (!enrollment || typeof enrollment !== "object") {
    return null;
  }

  const id = enrollment.club_enrollment_id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

/**
 * GET /api/v1/clubs/:clubId/sections/:sectionId/enrollments/current
 * Returns the section enrollment for the current ecclesiastical year, or null.
 */
export async function getCurrentClubEnrollment(
  clubId: number,
  sectionId: number,
): Promise<ClubEnrollment | null> {
  const response = await apiRequest<ClubEnrollment | null | ApiEnvelope<ClubEnrollment | null>>(
    `/clubs/${clubId}/sections/${sectionId}/enrollments/current`,
  );

  const data = unwrapApiData(response);
  if (!data) {
    return null;
  }

  return extractEnrollmentId(data) ? data : null;
}

export function getClubEnrollmentId(
  enrollment: ClubEnrollment | null,
): string | null {
  return extractEnrollmentId(enrollment);
}
