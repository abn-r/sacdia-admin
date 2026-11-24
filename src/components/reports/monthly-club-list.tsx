"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Eye, FileText, Pencil, Send, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { RowActions, RowActionsHead, type RowAction } from "@/components/shared/row-actions";
import { MonthlyReportStatus } from "@/components/reports/monthly-report-status";
import {
  generateReport,
  submitReport,
  triggerMonthlyReportPdfDownload,
  waitForMonthlyReport,
  type MonthlyReport,
} from "@/lib/api/monthly-reports";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDate } from "@/lib/format-locale";
import { useToastError } from "@/lib/feedback/toast-retry";
import { MONTHLY_STATUSES, monthlyYearOptions } from "@/lib/reports/status";
import { reportsTabHref } from "@/lib/reports/tabs";

const ALL = "all";
const COLUMNS = 5;

export interface MonthlyClubSearchParams {
  /** A year, or `all`. Defaults to the current year. */
  year?: string;
  status?: string;
}

interface MonthlyClubListProps {
  /** `null` when the list failed to load: the table shows the error, never an empty list. */
  reports: MonthlyReport[] | null;
  error?: ErrorStateFromError | null;
  searchParams: MonthlyClubSearchParams;
  currentYear: number;
  /** "Club Orión (Aventureros)" for the send confirmation; null when unknown. */
  clubLabel: string | null;
}

type BusyAction = "generate" | "submit" | "pdf";

export function MonthlyClubList({ reports, error = null, searchParams, currentYear, clubLabel }: MonthlyClubListProps) {
  const t = useTranslations("evaluation.reports");
  const tr = useTranslations("reports");
  const router = useRouter();
  const formatDate = useFormatDate();
  const toastError = useToastError();
  const [busy, setBusy] = useState<Record<string, BusyAction>>({});
  const [toSend, setToSend] = useState<MonthlyReport | null>(null);

  const year = searchParams.year ?? String(currentYear);
  const hasFilters = year !== String(currentYear) || Boolean(searchParams.status);

  function setFilter(key: keyof MonthlyClubSearchParams, value: string) {
    router.push(reportsTabHref("monthly", { ...searchParams, [key]: value === ALL && key === "status" ? undefined : value }));
  }

  const monthName = (report: MonthlyReport) => tr(`months.${report.month}` as Parameters<typeof tr>[0]);
  const dayOf = (value: string | null | undefined) =>
    value ? formatDate(value, { day: "numeric", month: "short", year: "numeric" }) : null;

  function track(report: MonthlyReport, action: BusyAction | null) {
    setBusy((previous) => {
      const next = { ...previous };
      if (action) next[report.report_id] = action;
      else delete next[report.report_id];
      return next;
    });
  }

  function failed(title: string, error: unknown, retry: () => void) {
    toastError({
      title,
      ...(error instanceof Error && error.message ? { description: error.message } : {}),
      onRetry: retry,
    });
  }

  async function generate(report: MonthlyReport) {
    track(report, "generate");
    try {
      const result = await generateReport(report.report_id);
      if (result.queued) {
        // 202: the job is queued; announce success only once the report leaves draft.
        const toastId = toast.loading(tr("toasts.report_generating"));
        const fresh = await waitForMonthlyReport(report.report_id, (candidate) => candidate.status !== "draft");
        toast.dismiss(toastId);
        if (!fresh) throw new Error(tr("errors.job_timeout"));
      }
      toast.success(tr("list.toastGenerated", { month: monthName(report), year: report.year }));
      router.refresh();
    } catch (err) {
      failed(tr("errors.generate_report"), err, () => void generate(report));
    } finally {
      track(report, null);
    }
  }

  async function download(report: MonthlyReport) {
    track(report, "pdf");
    try {
      await triggerMonthlyReportPdfDownload(report.report_id);
    } catch (err) {
      failed(t("errors.download"), err, () => void download(report));
    } finally {
      track(report, null);
    }
  }

  async function send(report: MonthlyReport) {
    track(report, "submit");
    try {
      await submitReport(report.report_id);
      toast.success(tr("list.toastSent", { month: monthName(report), year: report.year }));
      router.refresh();
    } finally {
      track(report, null);
    }
  }

  const actionsFor = (report: MonthlyReport): RowAction[] => {
    const submitted = report.status === "submitted";
    const generated = report.status === "generated";
    const working = Boolean(busy[report.report_id]);
    return [
      {
        label: submitted ? tr("list.actionView") : tr("list.actionEdit"),
        icon: submitted ? Eye : Pencil,
        href: `/dashboard/reports/${report.report_id}`,
      },
      {
        label: tr("list.actionGenerate"),
        icon: Zap,
        onSelect: () => void generate(report),
        disabled: working,
        hidden: submitted || generated,
      },
      {
        label: t("list.actionSend"),
        icon: Send,
        onSelect: () => setToSend(report),
        disabled: working,
        hidden: !generated,
      },
      {
        label: tr("list.actionPdf"),
        icon: Download,
        onSelect: () => void download(report),
        disabled: working,
        hidden: !(generated || submitted),
      },
    ];
  };

  const period = (report: MonthlyReport) => `${monthName(report)} ${report.year}`;
  const sendPeriod = toSend ? period(toSend) : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reports-club-year">{tr("list.yearPlaceholder")}</Label>
          <Select value={year} onValueChange={(value) => setFilter("year", value)}>
            <SelectTrigger id="reports-club-year" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tr("list.allYears")}</SelectItem>
              {monthlyYearOptions(currentYear).map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-club-status">{tr("list.statusPlaceholder")}</Label>
          <Select value={searchParams.status ?? ALL} onValueChange={(value) => setFilter("status", value)}>
            <SelectTrigger id="reports-club-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tr("list.allStatuses")}</SelectItem>
              {MONTHLY_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <DataTableShell>
          <Table>
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{t("club.columnPeriod")}</TableHead>
                <TableHead>{tr("list.tableHeaderStatus")}</TableHead>
                <TableHead>{tr("list.tableHeaderGenerated")}</TableHead>
                <TableHead>{tr("list.tableHeaderSubmitted")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow colSpan={COLUMNS} kind={error.kind} {...(error.detail ? { detail: error.detail } : {})} retry />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          variant={hasFilters ? "no-results" : "default"}
          title={tr("list.emptyTitle")}
          description={tr("list.emptyDescription")}
        />
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("club.columnPeriod")}</TableHead>
                  <TableHead>{tr("list.tableHeaderStatus")}</TableHead>
                  <TableHead>{tr("list.tableHeaderGenerated")}</TableHead>
                  <TableHead>{tr("list.tableHeaderSubmitted")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.report_id}>
                    <TableCell>
                      <Link href={`/dashboard/reports/${report.report_id}`} className="font-medium hover:underline">
                        {period(report)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <MonthlyReportStatus status={report.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {dayOf(report.generated_at) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {dayOf(report.submitted_at) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions label={period(report)} actions={actionsFor(report)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="md:hidden" aria-label={tr("list.ariaListLabel")}>
            {reports.map((report) => {
              const details = [
                report.generated_at ? `${tr("list.tableHeaderGenerated")} ${dayOf(report.generated_at)}` : null,
                report.submitted_at ? `${tr("list.tableHeaderSubmitted")} ${dayOf(report.submitted_at)}` : null,
              ].filter(Boolean);
              return (
                <li key={report.report_id} className="flex items-start gap-2 border-b py-3 last:border-b-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/dashboard/reports/${report.report_id}`} className="truncate font-medium hover:underline">
                        {period(report)}
                      </Link>
                      <MonthlyReportStatus status={report.status} />
                    </div>
                    {details.length > 0 && (
                      <p className="text-[13px] text-muted-foreground tabular-nums">{details.join(" · ")}</p>
                    )}
                  </div>
                  <RowActions label={period(report)} actions={actionsFor(report)} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toSend !== null}
        onOpenChange={(open) => {
          if (!open) setToSend(null);
        }}
        title={tr("detail.sendConfirmTitle")}
        description={
          clubLabel
            ? tr("detail.sendConfirmDescription", { period: sendPeriod, club: clubLabel })
            : tr("detail.sendConfirmDescriptionNoClub", { period: sendPeriod })
        }
        confirmLabel={tr("detail.actionSendToField")}
        cancelLabel={tr("detail.sendConfirmCancel")}
        onConfirm={async () => {
          if (toSend) await send(toSend);
        }}
      />
    </div>
  );
}
