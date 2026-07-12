"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { CronRunsSummary, CronRecentRun, CronJobStats } from "@/lib/api/analytics";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type CronJobKey =
  | "monthly-reports-auto-generate"
  | "rankings-recalculate"
  | "data-export-cleanup"
  | "member-of-month-auto-evaluate"
  | "finance-period-closing"
  | "activities-reminder"
  | "membership-requests-expiry"
  | "cleanup-expired-records"
  | "fcm-tokens-cleanup";

const JOB_CANONICAL_NAMES: CronJobKey[] = [
  "monthly-reports-auto-generate",
  "rankings-recalculate",
  "data-export-cleanup",
  "member-of-month-auto-evaluate",
  "finance-period-closing",
  "activities-reminder",
  "membership-requests-expiry",
  "cleanup-expired-records",
  "fcm-tokens-cleanup",
];

type CronRunsT = ReturnType<typeof useTranslations<"system_jobs.cronRuns">>;
const JOB_I18N_KEYS: Record<CronJobKey, Parameters<CronRunsT>[0]> = {
  "monthly-reports-auto-generate":  "jobMonthlyReports",
  "rankings-recalculate":           "jobRankingsRecalculate",
  "data-export-cleanup":            "jobDataExportCleanup",
  "member-of-month-auto-evaluate":  "jobMemberOfMonth",
  "finance-period-closing":         "jobFinancePeriod",
  "activities-reminder":            "jobActivitiesReminder",
  "membership-requests-expiry":     "jobMembershipExpiry",
  "cleanup-expired-records":        "jobCleanupExpired",
  "fcm-tokens-cleanup":             "jobFcmCleanup",
};

interface CronRunsSectionProps {
  data: CronRunsSummary;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function CronRunsSection({ data }: CronRunsSectionProps) {
  const t = useTranslations("system_jobs.cronRuns");
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();

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
                <TableHead className="text-right pr-6">{t("colRuns7d")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JOB_CANONICAL_NAMES.map((canonicalName) => {
                const i18nKey = JOB_I18N_KEYS[canonicalName];
                const run   = recentByName.get(canonicalName) ?? null;
                const stats = statsByName.get(canonicalName) ?? null;

                return (
                  <TableRow key={canonicalName}>
                    {/* Job name */}
                    <TableCell className="pl-6">
                      <span className="text-sm font-medium">{t(i18nKey)}</span>
                      <span className="block text-[11px] text-muted-foreground font-mono">
                        {canonicalName}
                      </span>
                    </TableCell>

                    {/* Last run */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(run?.started_at ?? null)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge
                        status={run?.status ?? null}
                        errorMessage={run?.error_message}
                      />
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
                    <TableCell className="text-right tabular-nums text-sm pr-6">
                      {stats !== null ? formatNumber(stats.total_runs_7d) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
