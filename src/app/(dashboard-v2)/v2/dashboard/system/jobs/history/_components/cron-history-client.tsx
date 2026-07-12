"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CronHistoryItem, CronHistoryPage } from "@/lib/api/analytics";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";

// ─── Constants ────────────────────────────────────────────────────────────────

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

type HistoryT = ReturnType<typeof useTranslations<"system_jobs.history">>;
const JOB_I18N_KEYS: Record<CronJobKey, Parameters<HistoryT>[0]> = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}min ${seconds}s`;
}

function statusVariant(
  status: string,
): "soft-info" | "success" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "completed": return "success";
    case "failed":    return "destructive";
    case "running":   return "soft-info";
    case "skipped":   return "secondary";
    default:          return "secondary";
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("system_jobs.history");

  function getLabel(s: string): string {
    switch (s) {
      case "completed": return t("statusCompleted");
      case "failed":    return t("statusFailed");
      case "running":   return t("statusRunning");
      case "skipped":   return t("statusSkipped");
      default:          return s;
    }
  }

  return (
    <Badge variant={statusVariant(status)} className="text-xs">
      {getLabel(status)}
    </Badge>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface DetailDialogProps {
  item: CronHistoryItem | null;
  onClose: () => void;
}

function DetailDialog({ item, onClose }: DetailDialogProps) {
  const t = useTranslations("system_jobs.history");
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : formatDateTime(d, { dateStyle: "short", timeStyle: "short" });
  }

  function jobDisplayName(canonicalName: string): string {
    const key = JOB_I18N_KEYS[canonicalName as CronJobKey];
    return key ? t(key) : canonicalName;
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {item ? t("detailTitle", { runId: item.run_id }) : ""}
          </DialogTitle>
          <DialogDescription>
            {item ? `Detalles de la ejecución del job ${item.job_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelJob")}</p>
                <p className="font-medium">{jobDisplayName(item.job_name)}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.job_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelStatus")}</p>
                <StatusBadge status={item.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelStart")}</p>
                <p>{formatDate(item.started_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelEnd")}</p>
                <p>{formatDate(item.ended_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelDuration")}</p>
                <p>{formatDuration(item.duration_ms)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("detailLabelItems")}</p>
                <p>{item.items_processed !== null ? formatNumber(item.items_processed) : "—"}</p>
              </div>
            </div>
            {item.error_message && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("detailLabelError")}</p>
                <pre className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-mono whitespace-pre-wrap break-all">
                  {item.error_message}
                </pre>
              </div>
            )}
            {item.metadata && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("detailLabelMetadata")}</p>
                <pre className="rounded-md bg-muted border p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CronHistorySearchParams {
  job_name?: string;
  status?: string;
  since?: string;
  until?: string;
  page?: string;
}

interface CronHistoryClientProps {
  initialData: CronHistoryPage;
  searchParams: CronHistorySearchParams;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CronHistoryClient({
  initialData,
  searchParams,
}: CronHistoryClientProps) {
  const t = useTranslations("system_jobs.history");
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CronHistoryItem | null>(null);
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : formatDateTime(d, { dateStyle: "short", timeStyle: "short" });
  }

  const currentPage = initialData.page;
  const totalPages = Math.ceil(initialData.total / initialData.limit);

  // Status options built from translations (moved inside component — contains UI strings)
  const STATUS_OPTIONS = [
    { value: "all",       label: t("filterAllStatuses") },
    { value: "completed", label: t("statusCompleted") },
    { value: "failed",    label: t("statusFailed") },
    { value: "skipped",   label: t("statusSkipped") },
    { value: "running",   label: t("statusRunning") },
  ];

  function jobDisplayName(canonicalName: string): string {
    const key = JOB_I18N_KEYS[canonicalName as CronJobKey];
    return key ? t(key) : canonicalName;
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────

  function buildUrl(overrides: Partial<CronHistorySearchParams>): string {
    const merged: Record<string, string> = {};
    const base: CronHistorySearchParams = { ...searchParams, ...overrides };
    if (base.job_name && base.job_name !== "all") merged.job_name = base.job_name;
    if (base.status && base.status !== "all") merged.status = base.status;
    if (base.since) merged.since = base.since;
    if (base.until) merged.until = base.until;
    if (base.page && base.page !== "1") merged.page = base.page;
    const qs = new URLSearchParams(merged);
    return `/dashboard/system/jobs/history${qs.toString() ? `?${qs}` : ""}`;
  }

  function handleFilterChange(key: keyof CronHistorySearchParams, value: string) {
    router.push(buildUrl({ [key]: value, page: "1" }));
  }

  function handlePageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />

      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Job name filter */}
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <span className="text-xs text-muted-foreground font-medium">
                  {t("filterLabelJob")}
                </span>
                <Select
                  value={searchParams.job_name ?? "all"}
                  onValueChange={(v) => handleFilterChange("job_name", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("filterAllJobs")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filterAllJobs")}</SelectItem>
                    {JOB_CANONICAL_NAMES.map((canonicalName) => (
                      <SelectItem key={canonicalName} value={canonicalName}>
                        {jobDisplayName(canonicalName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <span className="text-xs text-muted-foreground font-medium">
                  {t("filterLabelStatus")}
                </span>
                <Select
                  value={searchParams.status ?? "all"}
                  onValueChange={(v) => handleFilterChange("status", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("filterAllStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Since */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">
                  {t("filterLabelSince")}
                </span>
                <Input
                  type="date"
                  className="h-8 text-sm w-[150px]"
                  value={searchParams.since ?? ""}
                  onChange={(e) => handleFilterChange("since", e.target.value)}
                />
              </div>

              {/* Until */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">
                  {t("filterLabelUntil")}
                </span>
                <Input
                  type="date"
                  className="h-8 text-sm w-[150px]"
                  value={searchParams.until ?? ""}
                  onChange={(e) => handleFilterChange("until", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("recordCount", { total: formatNumber(initialData.total) })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {initialData.items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("noResults")}
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">{t("colJob")}</TableHead>
                      <TableHead>{t("colStart")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
                      <TableHead>{t("colDuration")}</TableHead>
                      <TableHead className="text-right">{t("colItems")}</TableHead>
                      <TableHead className="max-w-[200px]">{t("colError")}</TableHead>
                      <TableHead className="pr-6 text-right">{t("colDetails")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.items.map((item) => (
                      <TableRow key={item.run_id}>
                        {/* Job */}
                        <TableCell className="pl-6">
                          <span className="text-sm font-medium">
                            {jobDisplayName(item.job_name)}
                          </span>
                          <span className="block text-[11px] text-muted-foreground font-mono">
                            {item.job_name}
                          </span>
                        </TableCell>

                        {/* Start */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(item.started_at)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>

                        {/* Duration */}
                        <TableCell className="tabular-nums text-sm">
                          {formatDuration(item.duration_ms)}
                        </TableCell>

                        {/* Items */}
                        <TableCell className="text-right tabular-nums text-sm">
                          {item.items_processed !== null
                            ? formatNumber(item.items_processed)
                            : "—"}
                        </TableCell>

                        {/* Error truncated */}
                        <TableCell className="max-w-[200px]">
                          {item.error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-xs text-destructive cursor-default font-mono">
                                  {item.error_message}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm break-words font-mono text-xs"
                              >
                                {item.error_message}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Details */}
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedItem(item)}
                            className="gap-1.5"
                          >
                            <Info className="size-3" />
                            {t("viewButton")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {t("pagination", { page: currentPage, totalPages })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="size-4 mr-1" />
                {t("paginationPrev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                {t("paginationNext")}
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
