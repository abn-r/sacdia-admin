"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Send,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualDataForm } from "@/components/reports/manual-data-form";
import {
  generateReport,
  regenerateReport,
  submitReport,
  triggerMonthlyReportPdfDownload,
  waitForMonthlyReport,
  type MonthlyReport,
  type MonthlyReportAutoData,
  type MonthlyReportJobResult,
} from "@/lib/api/monthly-reports";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import {
  hasReportAutoData,
  readReportAutoData,
  type ReportAutoSummary,
} from "@/components/reports/report-auto-data";

const REPORT_DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const REPORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

// ─── Auto-data card ────────────────────────────────────────────────────────────

interface AutoDataRow {
  label: string;
  value: unknown;
}

function AutoDataCard({
  title,
  rows,
  description,
}: {
  title: string;
  description?: string;
  rows: AutoDataRow[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {rows.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {value != null && value !== "" ? String(value) : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; primary: string; secondary?: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.key} className="flex items-baseline justify-between gap-4 py-2">
              <span className="font-medium">{item.primary}</span>
              {item.secondary && (
                <span className="text-xs text-muted-foreground">{item.secondary}</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AutoDataSection({
  data,
  title,
  noDataMessage,
  autoDataDescription,
  rows,
  summary,
  formatDay,
  labels,
}: {
  data?: MonthlyReportAutoData | null;
  title: string;
  noDataMessage: string;
  autoDataDescription: string;
  rows: AutoDataRow[];
  summary: ReportAutoSummary;
  formatDay: (value: string) => string;
  labels: {
    directiva: string;
    activities: string;
    honors: string;
    honorValidated: string;
    honorPending: string;
  };
}) {
  if (!hasReportAutoData(data)) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {noDataMessage}
      </div>
    );
  }

  const dated = (value?: string | null) => (value ? formatDay(value) : undefined);

  return (
    <>
      <AutoDataCard title={title} description={autoDataDescription} rows={rows} />
      <DetailList
        title={labels.directiva}
        items={summary.directiva.map((member, index) => ({
          key: `${member.user_id ?? "member"}-${index}`,
          primary: member.name ?? "—",
          secondary: member.role ?? undefined,
        }))}
      />
      <DetailList
        title={labels.activities}
        items={summary.activityList.map((activity, index) => ({
          key: `${activity.activity_id ?? "activity"}-${index}`,
          primary: activity.name ?? "—",
          secondary: [activity.type, dated(activity.date)].filter(Boolean).join(" · ") || undefined,
        }))}
      />
      <DetailList
        title={labels.honors}
        items={summary.honorDetails.map((honor, index) => ({
          key: `${honor.honor_name ?? "honor"}-${index}`,
          primary: [honor.honor_name, honor.user_name].filter(Boolean).join(" — ") || "—",
          secondary:
            [
              honor.validated ? labels.honorValidated : labels.honorPending,
              dated(honor.date),
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
        }))}
      />
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportDetailClientProps {
  report: MonthlyReport;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportDetailClient({ report: initialReport }: ReportDetailClientProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const formatDate = useFormatDateTime();
  const [report, setReport] = useState<MonthlyReport>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const formatNumber = useFormatNumber();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const statusIntent =
    report.status === "submitted"
      ? "success"
      : report.status === "draft"
        ? "warning"
        : "neutral";

  const monthName = t(`months.${report.month}` as Parameters<typeof t>[0]);
  const isSubmitted = report.status === "submitted";
  const isGenerated = report.status === "generated";

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const toastId = `report-job-${report.report_id}`;
    const regenerating = isGenerated;
    // regenerate only re-renders the PDF (generated_at/snapshot stay), so its
    // completion marker is a new pdf_generated_at; generate flips status.
    const previousPdfAt = report.pdf_generated_at ?? null;

    try {
      const result: MonthlyReportJobResult = await (regenerating
        ? regenerateReport(report.report_id)
        : generateReport(report.report_id));

      let fresh: MonthlyReport | null;
      if (result.queued) {
        toast.loading(
          t(regenerating ? "toasts.report_regenerating" : "toasts.report_generating"),
          { id: toastId },
        );
        fresh = await waitForMonthlyReport(
          report.report_id,
          (candidate) =>
            regenerating
              ? (candidate.pdf_generated_at ?? null) !== previousPdfAt
              : candidate.status !== "draft",
          { shouldStop: () => !mountedRef.current },
        );
        if (!mountedRef.current) {
          toast.dismiss(toastId);
          return;
        }
        if (!fresh) {
          toast.error(t("errors.job_timeout"), { id: toastId });
          return;
        }
      } else {
        fresh = result.report;
      }

      setReport(fresh);
      toast.success(
        t(regenerating ? "toasts.report_regenerated" : "toasts.report_generated"),
        { id: toastId },
      );
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.generate_report");
      toast.error(message, { id: toastId });
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [isGenerated, report.report_id, report.pdf_generated_at, router, t]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const updated = await submitReport(report.report_id);
      setReport(updated);
      toast.success(t("toasts.report_sent"));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.send_report");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [report.report_id, router, t]);

  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    try {
      await triggerMonthlyReportPdfDownload(report.report_id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("errors.load_reports");
      toast.error(message);
    } finally {
      setDownloadingPdf(false);
    }
  }, [report.report_id, t]);

  const buildRows = (summary: ReportAutoSummary): AutoDataRow[] => {
    const num = (value: number | null) => (value !== null ? formatNumber(value) : null);
    const rows: AutoDataRow[] = [
      { label: t("detail.fieldTotalMembers"), value: num(summary.members) },
      { label: t("detail.fieldActivities"), value: num(summary.activities) },
      { label: t("detail.fieldHonorsStarted"), value: num(summary.honorsStarted) },
      { label: t("detail.fieldHonorsCompleted"), value: num(summary.honorsCompleted) },
      { label: t("detail.fieldIncome"), value: num(summary.income) },
      { label: t("detail.fieldExpenses"), value: num(summary.expenses) },
      { label: t("detail.fieldBalance"), value: num(summary.balance) },
      { label: t("detail.fieldTotalBalance"), value: num(summary.totalBalance) },
      { label: t("detail.fieldTransactions"), value: num(summary.transactions) },
      { label: t("detail.fieldMeetingDays"), value: summary.meetingDays },
    ];
    // Legacy flat fields: only shown when a payload actually carries them.
    if (summary.membersActive !== null) {
      rows.push({ label: t("detail.fieldActiveMembers"), value: num(summary.membersActive) });
    }
    if (summary.classesCompleted !== null) {
      rows.push({ label: t("detail.fieldClassesCompleted"), value: num(summary.classesCompleted) });
    }
    if (summary.attendanceRate !== null) {
      rows.push({
        label: t("detail.fieldAttendanceRate"),
        value: `${summary.attendanceRate.toFixed(1)}%`,
      });
    }
    return rows;
  };

  // GET :id returns the frozen snapshot but no live auto_data: the auto tab
  // falls back to the snapshot for generated/submitted reports.
  const autoData = report.auto_data ?? report.snapshot_data ?? null;
  const autoSummary = readReportAutoData(autoData);
  const snapshotSummary = readReportAutoData(report.snapshot_data);
  const autoDataRows = buildRows(autoSummary);
  const snapshotRows = buildRows(snapshotSummary);
  const sectionLabels = {
    directiva: t("detail.sectionDirectiva"),
    activities: t("detail.sectionActivities"),
    honors: t("detail.sectionHonors"),
    honorValidated: t("detail.honorValidated"),
    honorPending: t("detail.honorPending"),
  };
  const formatDay = (value: string) => formatDate(value, REPORT_DAY_OPTIONS);

  return (
    <div className="space-y-6">
      {/* Report meta info */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("detail.labelStatus")}</span>
          <StatusBadge intent={statusIntent} label={t(`status.${report.status}`)} size="sm" />
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-sm text-muted-foreground">
          {t("detail.labelPeriod")}{" "}
          <span className="font-medium text-foreground">
            {monthName} {report.year}
          </span>
        </div>
        {report.generated_at && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm text-muted-foreground">
              {t("detail.labelGenerated")}{" "}
              <span className="font-medium text-foreground">
                {report.generated_at ? formatDate(report.generated_at, REPORT_DATE_OPTIONS) : "—"}
              </span>
            </div>
          </>
        )}
        {report.submitted_at && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm text-muted-foreground">
              {t("detail.labelSubmitted")}{" "}
              <span className="font-medium text-foreground">
                {report.submitted_at ? formatDate(report.submitted_at, REPORT_DATE_OPTIONS) : "—"}
              </span>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isSubmitted && (
            <Button
              loading={generating}
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={submitting}
            >
              <Zap className="size-4" />
              {isGenerated ? t("detail.actionRegenerate") : t("detail.actionGenerate")}
            </Button>
          )}
          {isGenerated && !isSubmitted && (
            <Button
              loading={submitting}
              size="sm"
              onClick={handleSubmit}
              disabled={generating}
            >
              <Send className="size-4" />
              {t("detail.actionSendToField")}
            </Button>
          )}
          {(isGenerated || isSubmitted) && (
            <Button
              loading={downloadingPdf}
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <Download className="size-4" />
              {t("detail.actionDownloadPdf")}
            </Button>
          )}
          {isSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <ExternalLink className="size-4" />
              {t("detail.actionViewPdf")}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="auto">
        <TabsList>
          <TabsTrigger value="auto">{t("detail.tabAutoData")}</TabsTrigger>
          <TabsTrigger value="manual">{t("detail.tabManualData")}</TabsTrigger>
          {report.snapshot_data && (
            <TabsTrigger value="snapshot">{t("detail.tabSnapshot")}</TabsTrigger>
          )}
        </TabsList>

        {/* Auto-calculated data */}
        <TabsContent value="auto" className="mt-4 space-y-4">
          <AutoDataSection
            data={autoData}
            title={
              report.auto_data
                ? t("detail.autoDataLiveTitle")
                : t("detail.autoDataSnapshotTitle")
            }
            noDataMessage={t("detail.noAutoData")}
            autoDataDescription={t("detail.autoDataDescription")}
            rows={autoDataRows}
            summary={autoSummary}
            formatDay={formatDay}
            labels={sectionLabels}
          />
        </TabsContent>

        {/* Manual data form */}
        <TabsContent value="manual" className="mt-4">
          <ManualDataForm
            reportId={report.report_id}
            initialData={report.manual_data}
            disabled={isSubmitted}
            onSuccess={() => {
              toast.success(t("toasts.data_updated"));
            }}
          />
        </TabsContent>

        {/* Frozen snapshot */}
        {report.snapshot_data && (
          <TabsContent value="snapshot" className="mt-4 space-y-4">
            <AutoDataSection
              data={report.snapshot_data}
              title={t("detail.autoDataSnapshotTitle")}
              noDataMessage={t("detail.noAutoData")}
              autoDataDescription={t("detail.autoDataDescription")}
              rows={snapshotRows}
              summary={snapshotSummary}
              formatDay={formatDay}
              labels={sectionLabels}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
