"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import type {
  CronJobDefinition,
  CronJobStats,
  CronRecentRun,
  CronRunsSummary,
} from "@/lib/api/analytics";
import { runCronJob } from "@/lib/api/analytics";
import { CRON_JOB_NAMES, getCronJobLabelKey } from "@/lib/system/cron-jobs";
import {
  cronRunNotifiesPeople,
  getCronRunDescriptionKey,
  previousMonthName,
} from "@/lib/system/cron-descriptions";
import { failureRatePercent, formatCronDuration } from "@/lib/system/cron-format";
import { useCanCapability } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import { CronRunStatus } from "./cron-run-status";
import {
  DETACHED_REFRESH_DELAY_MS,
  getCronRunErrorKey,
  isRunDetachedError,
} from "./cron-run-errors";

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

interface JobRow {
  name: string;
  description: string | null;
  schedule: string | null;
  timeZone: string | null;
  runnable: boolean;
}

/** Catalog first (backend order), then jobs only seen in runs data. */
export function buildJobRows(
  catalog: CronJobDefinition[] | undefined,
  data: CronRunsSummary,
): JobRow[] {
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

interface CronRunsSectionProps {
  data: CronRunsSummary;
  /**
   * Scheduled jobs catalog (GET /admin/cron-jobs). Undefined when it could not
   * be loaded (non super-admin gets 403, or error): the table then shows known
   * jobs without run actions.
   */
  catalog?: CronJobDefinition[];
}

export function CronRunsSection({ data, catalog }: CronRunsSectionProps) {
  const t = useTranslations("system_jobs.cronRuns");
  const tSys = useTranslations("admin.system");
  const locale = useLocale();
  const router = useRouter();
  const canRunJobs = useCanCapability("admin-system-jobs", "run");
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const [confirmJob, setConfirmJob] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set());

  const now = Date.now();
  const rows = buildJobRows(catalog, data);
  const rowsByName = new Map(rows.map((r) => [r.name, r]));
  const showActions = canRunJobs && rows.some((r) => r.runnable);
  const recentByName = new Map<string, CronRecentRun>(data.recent.map((r) => [r.job_name, r]));
  const statsByName = new Map<string, CronJobStats>(data.stats.map((s) => [s.job_name, s]));

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
    return Number.isNaN(d.getTime())
      ? "—"
      : formatDateTime(d, { dateStyle: "medium", timeStyle: "short" });
  }

  const confirmRow = confirmJob ? rowsByName.get(confirmJob) : undefined;
  const confirmLabel = confirmJob ? (confirmRow ? jobLabel(confirmRow) : confirmJob) : "";
  const confirmNotifies = confirmJob ? cronRunNotifiesPeople(confirmJob) : false;

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">{tSys("cron.colTask")}</TableHead>
            <TableHead>{t("colLastRun")}</TableHead>
            <TableHead>{t("colDuration")}</TableHead>
            <TableHead className="text-right">{tSys("cron.colFailures7d")}</TableHead>
            {showActions ? <TableHead className="w-px" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const label = jobLabel(row);
            const run = recentByName.get(row.name) ?? null;
            const stats = statsByName.get(row.name) ?? null;
            const percent = failureRatePercent(stats?.failure_rate_7d);

            return (
              <TableRow key={row.name} data-job={row.name}>
                <TableCell className="whitespace-normal">
                  <span className="block text-sm font-medium">{label}</span>
                  {row.schedule ? (
                    <span className="block font-mono text-xs text-muted-foreground">
                      {row.timeZone ? `${row.schedule} · ${row.timeZone}` : row.schedule}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className={run ? undefined : "text-muted-foreground"}>
                      {formatDate(run?.started_at ?? null)}
                    </span>
                    {run?.status === "failed" ? (
                      <CronRunStatus status="failed" errorMessage={run.error_message} />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {formatCronDuration(run?.duration_ms ?? null, formatNumber)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {percent === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${formatNumber(percent)}%`
                  )}
                </TableCell>
                {showActions ? (
                  <TableCell className="text-right">
                    {row.runnable ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        disabled={inFlight.has(row.name) || isRunningRecently(run, now)}
                        aria-label={`${inFlight.has(row.name) ? t("runNowRunning") : t("runNow")}: ${label}`}
                        onClick={() => setConfirmJob(row.name)}
                      >
                        {inFlight.has(row.name) ? t("runNowRunning") : t("runNow")}
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={confirmJob !== null} onOpenChange={(open) => !open && setConfirmJob(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmJob ? t("runDialogTitle", { job: confirmLabel }) : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmJob
                ? tSys(`runDescriptions.${getCronRunDescriptionKey(confirmJob)}`, {
                    month: previousMonthName(new Date(), locale),
                  })
                : null}
            </AlertDialogDescription>
            <p className="text-sm text-muted-foreground">{t("runDialogDescription")}</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("runDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmJob) void handleRun(confirmJob);
              }}
            >
              {confirmNotifies ? tSys("cron.runAndNotify") : t("runDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
