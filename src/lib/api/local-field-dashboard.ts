import { apiRequest } from "@/lib/api/client";

export type ClassMemberCount = {
  class_id: number;
  class_name: string;
  display_order: number;
  member_count: number;
};

export type ClubTypeMemberBreakdown = {
  club_type_id: number;
  club_type_name: string;
  classes: ClassMemberCount[];
};

export type TimeWindowCounts = {
  last_7_days: number;
  last_30_days: number;
  last_90_days: number;
};

export type ActivityWindowCounts = {
  last_7_days: number;
  last_30_days: number;
  last_365_days: number;
};

export type ClubTypeHonorCounts = {
  club_type_id: number;
  club_type_name: string;
  completed: TimeWindowCounts;
};

export type LocalFieldDashboard = {
  local_field_id: number;
  local_field_name: string;
  ecclesiastical_year_id: number;
  ecclesiastical_year_label: string | null;
  report_year: number;
  report_month: number;
  active_members: number;
  active_clubs: number;
  enrolled_clubs_this_year: number;
  enrolled_sections_this_year: number;
  clubs_with_monthly_report: number;
  clubs_without_monthly_report: number;
  members_by_club_type: ClubTypeMemberBreakdown[];
  honors_completed_by_club_type: ClubTypeHonorCounts[];
  honors_completed_total: TimeWindowCounts;
  activities: ActivityWindowCounts;
  cached: boolean;
};

type LocalFieldDashboardEnvelope = {
  status: string;
  data: LocalFieldDashboard;
};

/**
 * GET /api/v1/admin/analytics/local-field-dashboard
 */
export async function fetchLocalFieldDashboard(
  localFieldId?: number,
): Promise<LocalFieldDashboard | null> {
  try {
    const envelope = await apiRequest<LocalFieldDashboardEnvelope>(
      "/admin/analytics/local-field-dashboard",
      {
        params:
          localFieldId !== undefined
            ? { local_field_id: localFieldId }
            : undefined,
      },
    );
    return envelope.data;
  } catch {
    return null;
  }
}
