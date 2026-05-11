"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Pencil,
  Zap,
  Send,
  Download,
  Plus,
  RefreshCw,
  Filter,
  Loader2,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import {
  listMonthlyReports,
  createOrGetDraftReport,
  generateReport,
  submitReport,
  getReportPdfUrl,
  type MonthlyReport,
  type ReportStatus,
} from "@/lib/api/monthly-reports";
import { useFormatDate } from "@/lib/format-locale";

// ─── Constants ────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const REPORTS_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsTableSkeleton({ headers }: { headers: string[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-32" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsListClientProps {
  enrollmentId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsListClient({ enrollmentId }: ReportsListClientProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const formatDate = useFormatDate();

  // Filters
  const [filterYear, setFilterYear] = useState<number | undefined>(currentYear);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");

  // Action loading per report
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});

  // New report creation state
  const [createMonth, setCreateMonth] = useState<number>(new Date().getMonth() + 1);
  const [createYear, setCreateYear] = useState<number>(currentYear);

  const queryClient = useQueryClient();

  const {
    data: rawReports = [],
    isFetching: loading,
    refetch: fetchReports,
  } = useQuery({
    queryKey: ["monthly-reports", enrollmentId, filterStatus],
    queryFn: () =>
      listMonthlyReports(
        enrollmentId,
        filterStatus !== "all" ? filterStatus : undefined,
      ),
    staleTime: 30_000,
  });

  const reports = filterYear
    ? rawReports.filter((r) => r.year === filterYear)
    : rawReports;

  // ─── Action handlers ──────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      createOrGetDraftReport(enrollmentId, createMonth, createYear),
    onSuccess: (report) => {
      toast.success(
        t("list.toastCreated", {
          month: t(`months.${createMonth}` as Parameters<typeof t>[0]),
          year: createYear,
        }),
      );
      router.push(`/dashboard/reports/${report.report_id}`);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : t("errors.create_report");
      toast.error(message);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (report: MonthlyReport) => {
      setActionLoading((prev) => ({ ...prev, [report.report_id]: "generate" }));
      return generateReport(report.report_id);
    },
    onSuccess: (_, report) => {
      toast.success(
        t("list.toastGenerated", {
          month: t(`months.${report.month}` as Parameters<typeof t>[0]),
          year: report.year,
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ["monthly-reports", enrollmentId],
      });
    },
    onError: (error, report) => {
      const message =
        error instanceof Error ? error.message : t("errors.generate_report");
      toast.error(message);
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    },
    onSettled: (_, __, report) => {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (report: MonthlyReport) => {
      setActionLoading((prev) => ({ ...prev, [report.report_id]: "submit" }));
      return submitReport(report.report_id);
    },
    onSuccess: (_, report) => {
      toast.success(
        t("list.toastSent", {
          month: t(`months.${report.month}` as Parameters<typeof t>[0]),
          year: report.year,
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ["monthly-reports", enrollmentId],
      });
    },
    onError: (error, report) => {
      const message =
        error instanceof Error ? error.message : t("errors.send_report");
      toast.error(message);
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    },
    onSettled: (_, __, report) => {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    },
  });

  function handleDownloadPdf(report: MonthlyReport) {
    const url = getReportPdfUrl(report.report_id);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const skeletonHeaders = [
    t("list.tableHeaderMonth"),
    t("list.tableHeaderYear"),
    t("list.tableHeaderStatus"),
    t("list.tableHeaderGenerated"),
    t("list.tableHeaderSubmitted"),
    t("list.tableHeaderActions"),
  ];

  return (
    <div className="space-y-6">
      {/* Filters and new report bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>{t("list.filters")}</span>
        </div>

        {/* Year filter */}
        <Select
          value={filterYear?.toString() ?? "all"}
          onValueChange={(v) => setFilterYear(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue placeholder={t("list.yearPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.allYears")}</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as ReportStatus | "all")}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder={t("list.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="generated">{t("status.generated")}</SelectItem>
            <SelectItem value="submitted">{t("status.submitted")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReports()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("list.refresh")}
        </Button>

        {/* Spacer */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Month selector for new report */}
          <Select
            value={createMonth.toString()}
            onValueChange={(v) => setCreateMonth(Number(v))}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NUMBERS.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {t(`months.${m}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={createYear.toString()}
            onValueChange={(v) => setCreateYear(Number(v))}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("list.newReport")}
          </Button>
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <ReportsTableSkeleton headers={skeletonHeaders} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
        />
      ) : (
        <>
          {/* Desktop: full table */}
          <div className="hidden md:block">
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("list.tableHeaderMonth")}</TableHead>
                    <TableHead>{t("list.tableHeaderYear")}</TableHead>
                    <TableHead>{t("list.tableHeaderStatus")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("list.tableHeaderGenerated")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("list.tableHeaderSubmitted")}</TableHead>
                    <TableHead className="w-[200px]">{t("list.tableHeaderActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const statusVariant = (
                      {
                        draft: "warning",
                        generated: "default",
                        submitted: "success",
                      } as const
                    )[report.status] ?? ("warning" as const);
                    const loadingAction = actionLoading[report.report_id];
                    const isDisabled = Boolean(loadingAction);
                    const isSubmitted = report.status === "submitted";
                    const isGenerated = report.status === "generated";

                    return (
                      <TableRow key={report.report_id}>
                        <TableCell className="font-medium">
                          {t(`months.${report.month}` as Parameters<typeof t>[0])}
                        </TableCell>
                        <TableCell className="tabular-nums">{report.year}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant} className="text-xs">
                            {t(`status.${report.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {report.generated_at ? formatDate(report.generated_at, REPORTS_DATE_OPTIONS) : "—"}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {report.submitted_at ? formatDate(report.submitted_at, REPORTS_DATE_OPTIONS) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="xs" asChild>
                              <Link href={`/dashboard/reports/${report.report_id}`}>
                                {isSubmitted ? (
                                  <Eye className="size-3" />
                                ) : (
                                  <Pencil className="size-3" />
                                )}
                                {isSubmitted ? t("list.actionView") : t("list.actionEdit")}
                              </Link>
                            </Button>

                            {!isSubmitted && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => generateMutation.mutate(report)}
                                disabled={isDisabled}
                              >
                                {loadingAction === "generate" ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Zap className="size-3" />
                                )}
                                {t("list.actionGenerate")}
                              </Button>
                            )}

                            {isGenerated && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => submitMutation.mutate(report)}
                                disabled={isDisabled}
                              >
                                {loadingAction === "submit" ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Send className="size-3" />
                                )}
                                {t("list.actionSend")}
                              </Button>
                            )}

                            {(isGenerated || isSubmitted) && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => handleDownloadPdf(report)}
                              >
                                <Download className="size-3" />
                                {t("list.actionPdf")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </div>

          {/* Mobile: descriptive cards */}
          <ul className="space-y-3 md:hidden" aria-label={t("list.ariaListLabel")}>
            {reports.map((report) => {
              const statusVariant = (
                {
                  draft: "warning",
                  generated: "default",
                  submitted: "success",
                } as const
              )[report.status] ?? ("warning" as const);
              const loadingAction = actionLoading[report.report_id];
              const isDisabled = Boolean(loadingAction);
              const isSubmitted = report.status === "submitted";
              const isGenerated = report.status === "generated";

              return (
                <li key={report.report_id}>
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t(`months.${report.month}` as Parameters<typeof t>[0])} {report.year}
                        </p>
                        <p className="truncate text-xs text-muted-foreground tabular-nums">
                          #{report.report_id}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/reports/${report.report_id}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={isSubmitted ? t("list.ariaViewReport") : t("list.ariaEditReport")}
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge variant={statusVariant} className="text-xs">
                        {t(`status.${report.status}`)}
                      </Badge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {report.generated_at && (
                        <div>
                          <dt className="text-muted-foreground">{t("list.tableHeaderGenerated")}</dt>
                          <dd>{formatDate(report.generated_at, REPORTS_DATE_OPTIONS)}</dd>
                        </div>
                      )}
                      {report.submitted_at && (
                        <div>
                          <dt className="text-muted-foreground">{t("list.tableHeaderSubmitted")}</dt>
                          <dd>{formatDate(report.submitted_at, REPORTS_DATE_OPTIONS)}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                      <Button variant="outline" size="xs" asChild>
                        <Link href={`/dashboard/reports/${report.report_id}`}>
                          {isSubmitted ? (
                            <Eye className="size-3" />
                          ) : (
                            <Pencil className="size-3" />
                          )}
                          {isSubmitted ? t("list.actionView") : t("list.actionEdit")}
                        </Link>
                      </Button>

                      {!isSubmitted && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => generateMutation.mutate(report)}
                          disabled={isDisabled}
                        >
                          {loadingAction === "generate" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Zap className="size-3" />
                          )}
                          {t("list.actionGenerate")}
                        </Button>
                      )}

                      {isGenerated && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => submitMutation.mutate(report)}
                          disabled={isDisabled}
                        >
                          {loadingAction === "submit" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Send className="size-3" />
                          )}
                          {t("list.actionSend")}
                        </Button>
                      )}

                      {(isGenerated || isSubmitted) && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleDownloadPdf(report)}
                        >
                          <Download className="size-3" />
                          {t("list.actionPdf")}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
