import { apiRequest } from "@/lib/api/client";

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
  trigger: "manual" | "scheduled";
  triggered_by: string | null;
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

// ─── Cron Jobs (run on demand) ────────────────────────────────────────────────

export interface CronJobDefinition {
  job_name: string;
  schedule: string;
  time_zone: string;
  runnable: boolean;
  description: string;
}

export type CronRunResultStatus = "completed" | "failed" | "skipped";

export interface CronRunResult {
  job_name: string;
  /** null when the job is queue-backed (the worker writes its own row later). */
  run_id: number | null;
  /** true when the work was only enqueued in BullMQ; the worker finishes it. */
  enqueued: boolean;
  status: CronRunResultStatus;
  items_processed: number | null;
  duration_ms: number | null;
  error_message: string | null;
}

export async function listCronJobs(): Promise<CronJobDefinition[]> {
  const res = await apiRequest<{ data: { jobs: CronJobDefinition[] } }>(
    "/admin/cron-jobs",
  );
  return res.data.jobs;
}

/** Runs a scheduled job now. Awaited by the backend, so it can take a while. */
export async function runCronJob(jobName: string): Promise<CronRunResult> {
  const res = await apiRequest<{ data: CronRunResult }>(
    `/admin/cron-jobs/${encodeURIComponent(jobName)}/run`,
    { method: "POST" },
  );
  return res.data;
}

/** True when a history run was triggered manually (`metadata.trigger === 'manual'`). */
export function isManualCronRun(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.trigger === "manual";
}
