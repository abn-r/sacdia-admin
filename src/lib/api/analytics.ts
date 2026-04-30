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

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSlaDashboard(): Promise<SlaDashboard> {
  const res = await apiRequest<{ status: string; data: SlaDashboard }>(
    "/admin/analytics/sla-dashboard",
  );
  return res.data;
}

// ─── Jobs & Queues ────────────────────────────────────────────────────────────

export type KnownQueueName = 'notifications' | 'email' | 'achievements' | 'background-jobs';

export type JobCounts = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused?: number;
};

export type FailedJob = {
  job_id: string | number | null;
  queue: string;
  name: string;
  failed_reason: string | null;
  attempts: number;
  timestamp: string | null;
};

export type JobsOverview = {
  queues: JobCounts[];
  recent_failed: FailedJob[];
};

export async function getJobsOverview(): Promise<JobsOverview> {
  const res = await apiRequest<{ status: string; data: JobsOverview }>(
    "/admin/analytics/jobs-overview",
  );
  return res.data;
}

export async function retryJob(
  queue: string,
  jobId: string | number,
): Promise<void> {
  await apiRequest(`/admin/analytics/jobs/${queue}/${jobId}/retry`, {
    method: "POST",
  });
}

// ─── Cron Runs ────────────────────────────────────────────────────────────────

export type CronRecentRun = {
  job_name: string;
  run_id: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_ms: number | null;
  items_processed: number | null;
  error_message: string | null;
};

export type CronJobStats = {
  job_name: string;
  avg_duration_ms_30d: number | null;
  failure_rate_7d: number | null;
  last_success: string | null;
  last_failure: string | null;
  total_runs_7d: number;
};

export type CronRunsSummary = {
  recent: CronRecentRun[];
  stats: CronJobStats[];
};

export async function getCronRuns(): Promise<CronRunsSummary> {
  const res = await apiRequest<{ status: string; data: CronRunsSummary }>(
    "/admin/analytics/cron-runs",
  );
  return res.data;
}

// ─── Cron History ─────────────────────────────────────────────────────────────

export interface CronHistoryItem {
  run_id: number;
  job_name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  items_processed: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CronHistoryPage {
  total: number;
  page: number;
  limit: number;
  items: CronHistoryItem[];
}

export async function getCronRunsHistory(params: {
  job_name?: string;
  status?: string;
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}): Promise<CronHistoryPage> {
  const qs = new URLSearchParams();
  if (params.job_name) qs.set("job_name", params.job_name);
  if (params.status) qs.set("status", params.status);
  if (params.since) qs.set("since", params.since);
  if (params.until) qs.set("until", params.until);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const url = `/admin/analytics/cron-runs/history${qs.toString() ? `?${qs}` : ""}`;
  const res = await apiRequest<{ status: string; data: CronHistoryPage }>(url);
  return res.data;
}
