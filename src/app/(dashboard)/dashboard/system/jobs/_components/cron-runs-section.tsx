"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CronRunsSummary,
  CronRecentRun,
  CronJobStats,
  CronJobDefinition,
} from "@/lib/api/analytics";
import { runCronJob } from "@/lib/api/analytics";
import { CRON_JOB_NAMES, getCronJobLabelKey } from "@/lib/system/cron-jobs";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import {
  DETACHED_REFRESH_DELAY_MS,
  getCronRunErrorKey,
  isRunDetachedError,
} from "./cron-run-errors";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Jobs that can notify real people (push/email) when run. */
const NOTIFYING_JOBS: ReadonlySet<string> = new Set([
  "activities-reminder",
  "cron-alert-check",
  "monthly-reports-reminders",
  "member-of-month-auto-evaluate",
  "pending-teen-guardian",
  "family-age-transitions",
  "investiture-authorization-reminders",
  "ecclesiastical-year-cut",
]);

/**
 * Jobs whose re-run has a heavier side effect than a plain notification; they
 * get a stronger, job-specific warning instead of the generic one.
 */
const JOB_SPECIFIC_WARNING_KEYS = {
  "member-of-month-auto-evaluate": "runDialogMemberOfMonthWarning",
} as const;

/**
 * A "running" row older than this is treated as stale (e.g. the process crashed
 * and never closed it), so it must not block a manual re-run. The backend still
 * returns "skipped" if the job is genuinely locked.
 */
export const STALE_RUNNING_THRESHOLD_MS = 15 * 60 * 1000;

function isRunningRecently(run: CronRecentRun | null, now: number): boolean {
  if (run?.status !== "running") return false;
  const startedAt = new Date(run.started_at).getTime();
  // Unparseable start: cannot prove it is stale, keep the safe (disabled) state.
  if (Number.isNaN(startedAt)) return true;
  return now - startedAt < STALE_RUNNING_THRESHOLD_MS;
}

interface CronRunsSectionProps {
  data: CronRunsSummary;
  /**
   * Scheduled jobs catalog (GET /admin/cron-jobs). Authoritative job list with
   * schedule/description. Undefined when it could not be loaded (non super-admin
   * gets 403, or error): the table then shows known jobs without run actions.
   */
  catalog?: CronJobDefinition[];
}

interface JobRow {
  name: string;
  description: string | null;
  schedule: string | null;
  timeZone: string | null;
  runnable: boolean;
}

/** Catalog first (backend order), then jobs only seen in runs data. */
function buildJobRows(catalog: CronJobDefinition[] | undefined, data: CronRunsSummary): JobRow[] {
  const rows = new Map<string, JobRow>();

  for (const job of catalog ?? []) {
    rows.set(job.job_name, {
      name: job.job_name,
      description: job.description || null,
      schedule: job.schedule || null,
      timeZone: job.time_zone || null,
      runnable: job.runnable,
    });
  }

  const extraNames = [
    ...(catalog ? [] : CRON_JOB_NAMES),
    ...data.recent.map((r) => r.job_name),
    ...data.stats.map((s) => s.job_name),
  ];
  for (const name of extraNames) {
    if (!rows.has(name)) {
      rows.set(name, { name, description: null, schedule: null, timeZone: null, runnable: false });
    }
  }

  return [...rows.values()];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}min ${seconds}s`;
}

function formatFailureRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

type CronStatus = "completed" | "failed" | "skipped" | "running";

function statusVariant(
  status: string,
): "soft-info" | "success" | "destructive" | "secondary" | "outline" {
  switch (status as CronStatus) {
    case "completed": return "success";
    case "failed":    return "destructive";
    case "running":   return "soft-info";
    case "skipped":   return "secondary";
    default:          return "secondary";
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  errorMessage,
}: {
  status: string | null;
  errorMessage?: string | null;
}) {
  const t = useTranslations("system_jobs.cronRuns");

  if (!status) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        {t("noRuns")}
      </Badge>
    );
  }

  function getStatusLabel(s: string): string {
    switch (s as CronStatus) {
      case "completed": return t("statusCompleted");
      case "failed":    return t("statusFailed");
      case "running":   return t("statusRunning");
      case "skipped":   return t("statusSkipped");
      default:          return s;
    }
  }

  const badge = (
    <Badge variant={statusVariant(status)} className="text-xs">
      {getStatusLabel(status)}
    </Badge>
  );

  if (status === "failed" && errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm break-words font-mono text-xs">
          {errorMessage}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

// ─── Run Now Button ───────────────────────────────────────────────────────────

function RunNowButton({
  jobLabel,
  busy,
  disabled,
  onClick,
}: {
  jobLabel: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("system_jobs.cronRuns");
  const label = busy ? t("runNowRunning") : t("runNow");

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={busy || disabled}
      aria-label={`${label}: ${jobLabel}`}
      onClick={onClick}
      className="gap-1.5"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
      {label}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CronRunsSection({ data, catalog }: CronRunsSectionProps) {
  const t = useTranslations("system_jobs.cronRuns");
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const [confirmJob, setConfirmJob] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set());

  const now = Date.now();
  const rows = buildJobRows(catalog, data);
  const rowsByName = new Map(rows.map((r) => [r.name, r]));
  const showActions = isSuperAdmin && rows.some((r) => r.runnable);

  const specificWarningKey =
    confirmJob && Object.hasOwn(JOB_SPECIFIC_WARNING_KEYS, confirmJob)
      ? JOB_SPECIFIC_WARNING_KEYS[confirmJob as keyof typeof JOB_SPECIFIC_WARNING_KEYS]
      : undefined;
  const warningKey =
    specificWarningKey ??
    (confirmJob && NOTIFYING_JOBS.has(confirmJob) ? ("runDialogNotifyWarning" as const) : undefined);

  function jobLabel(row: JobRow): string {
    const key = getCronJobLabelKey(row.name);
    return key ? t(key) : row.description || row.name;
  }

  function setJobInFlight(jobName: string, active: boolean) {
    setInFlight((prev) => {
      const next = new Set(prev);
      if (active) next.add(jobName);
      else next.delete(jobName);
      return next;
    });
  }

  async function handleRun(jobName: string) {
    if (inFlight.has(jobName)) return;
    setJobInFlight(jobName, true);
    try {
      const result = await runCronJob(jobName);
      if (result.enqueued) {
        toast.info(t("runResultEnqueued"));
      } else if (result.status === "completed") {
        toast.success(
          result.items_processed === null || result.items_processed === undefined
            ? t("runResultCompletedNoCount")
            : t("runResultCompleted", { count: result.items_processed }),
        );
      } else if (result.status === "skipped") {
        toast.info(t("runResultSkipped"));
      } else {
        toast.error(
          result.error_message
            ? t("runResultFailed", { message: result.error_message })
            : t("runResultFailedNoMessage"),
        );
      }
      router.refresh();
    } catch (err) {
      if (isRunDetachedError(err)) {
        // The request was cut but the run continues server-side: refresh later.
        toast.info(t("runDetached"));
        setTimeout(() => router.refresh(), DETACHED_REFRESH_DELAY_MS);
      } else {
        toast.error(t(getCronRunErrorKey(err)));
      }
    } finally {
      setJobInFlight(jobName, false);
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : formatDateTime(d, { dateStyle: "short", timeStyle: "short" });
  }

  // Index server data by job_name for O(1) lookups
  const recentByName = new Map<string, CronRecentRun>(
    data.recent.map((r) => [r.job_name, r]),
  );
  const statsByName = new Map<string, CronJobStats>(
    data.stats.map((s) => [s.job_name, s]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 min-w-[200px]">{t("colJob")}</TableHead>
                <TableHead>{t("colLastRun")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDuration")}</TableHead>
                <TableHead className="text-right">{t("colItems")}</TableHead>
                <TableHead>{t("colLastSuccess")}</TableHead>
                <TableHead>{t("colLastFailure")}</TableHead>
                <TableHead className="text-right">{t("colFailureRate")}</TableHead>
                <TableHead className={showActions ? "text-right" : "text-right pr-6"}>
                  {t("colRuns7d")}
                </TableHead>
                {showActions && (
                  <TableHead className="text-right pr-6">{t("colActions")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const canonicalName = row.name;
                const label = jobLabel(row);
                const run   = recentByName.get(canonicalName) ?? null;
                const stats = statsByName.get(canonicalName) ?? null;

                return (
                  <TableRow key={canonicalName}>
                    {/* Job name */}
                    <TableCell className="pl-6">
                      <span className="text-sm font-medium" title={row.description ?? undefined}>
                        {label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground font-mono">
                        {canonicalName}
                      </span>
                      {row.schedule && (
                        <span className="block text-[11px] text-muted-foreground font-mono">
                          {row.timeZone ? `${row.schedule} · ${row.timeZone}` : row.schedule}
                        </span>
                      )}
                    </TableCell>

                    {/* Last run */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(run?.started_at ?? null)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={run?.status ?? null}
                          errorMessage={run?.error_message}
                        />
                        {run?.trigger === "manual" && (
                          <Badge variant="outline" className="text-xs">
                            {t("manualBadge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="tabular-nums text-sm">
                      {formatDuration(run?.duration_ms ?? null)}
                    </TableCell>

                    {/* Items processed */}
                    <TableCell className="text-right tabular-nums text-sm">
                      {run?.items_processed !== undefined && run.items_processed !== null
                        ? formatNumber(run.items_processed)
                        : "—"}
                    </TableCell>

                    {/* Last success */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(stats?.last_success ?? null)}
                    </TableCell>

                    {/* Last failure */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(stats?.last_failure ?? null)}
                    </TableCell>

                    {/* Failure rate 7d */}
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatFailureRate(stats?.failure_rate_7d ?? null)}
                    </TableCell>

                    {/* Runs 7d */}
                    <TableCell
                      className={
                        showActions
                          ? "text-right tabular-nums text-sm"
                          : "text-right tabular-nums text-sm pr-6"
                      }
                    >
                      {stats !== null ? formatNumber(stats.total_runs_7d) : "—"}
                    </TableCell>

                    {/* Run now (super-admin only; backend enforces too) */}
                    {showActions && (
                      <TableCell className="text-right pr-6">
                        {row.runnable && (
                          <RunNowButton
                            jobLabel={label}
                            busy={inFlight.has(canonicalName)}
                            disabled={isRunningRecently(run, now)}
                            onClick={() => setConfirmJob(canonicalName)}
                          />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>

      <AlertDialog
        open={confirmJob !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmJob(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmJob
                ? t("runDialogTitle", {
                    job: rowsByName.has(confirmJob) ? jobLabel(rowsByName.get(confirmJob)!) : confirmJob,
                  })
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("runDialogDescription")}</AlertDialogDescription>
            {warningKey && (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-sm font-medium text-warning-soft-foreground">
                {t(warningKey)}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("runDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmJob) void handleRun(confirmJob);
              }}
            >
              {t("runDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
