import { apiRequest } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvestiturePipelineItem = {
  status: string;
  label: string;
  count: number;
};

export type InvestitureSummary = {
  total_pending: number;
  in_review: number;
  overdue: number;
  pipeline: InvestiturePipelineItem[];
};

export type ValidationSummary = {
  class_sections_pending: number;
  honors_pending: number;
  total_pending: number;
};

export type CamporeeSummary = {
  clubs_pending: number;
  members_pending: number;
  payments_pending: number;
};

export type TimingMetrics = {
  avg_days_to_submit: number | null;
  avg_days_club_approval: number | null;
  avg_days_coordinator_approval: number | null;
  avg_days_field_approval: number | null;
  avg_days_total: number | null;
};

export type ThroughputWeek = {
  week: string;
  approved: number;
  rejected: number;
};

export type ApprovalRate = {
  resolved: number;
  approved: number;
  rate: number;
};

export type SlaDashboard = {
  investiture: InvestitureSummary;
  validation: ValidationSummary;
  camporee: CamporeeSummary;
  timing: TimingMetrics;
  throughput: ThroughputWeek[];
  approval_rate: ApprovalRate;
  computed_at: string;
  cached: boolean;
};

// ─── API function ─────────────────────────────────────────────────────────────

export async function getSlaDashboard(): Promise<SlaDashboard> {
  const res = await apiRequest<{ status: string; data: SlaDashboard }>(
    "/admin/analytics/sla-dashboard",
  );
  return res.data;
}
