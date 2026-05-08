"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  Send,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  submitReport,
  getReportPdfUrl,
  type MonthlyReport,
  type MonthlyReportAutoData,
} from "@/lib/api/monthly-reports";
import { useFormatDateTime } from "@/lib/format-locale";

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

function AutoDataSection({
  data,
  title,
  noDataMessage,
  autoDataDescription,
  rows,
}: {
  data?: MonthlyReportAutoData | null;
  title: string;
  noDataMessage: string;
  autoDataDescription: string;
  rows: AutoDataRow[];
}) {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {noDataMessage}
      </div>
    );
  }

  return (
    <AutoDataCard
      title={title}
      description={autoDataDescription}
      rows={rows}
    />
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

  const statusVariant = (
    {
      draft: "warning",
      generated: "default",
      submitted: "success",
    } as const
  )[report.status] ?? ("warning" as const);

  const monthName = t(`months.${report.month}`);
  const isSubmitted = report.status === "submitted";
  const isGenerated = report.status === "generated";

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const updated = await generateReport(report.report_id);
      setReport(updated);
      toast.success(t("toasts.report_generated"));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.generate_report");
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [report.report_id, router, t]);

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

  const handleDownloadPdf = useCallback(() => {
    const url = getReportPdfUrl(report.report_id);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [report.report_id]);

  const autoDataRows: AutoDataRow[] = [
    { label: t("detail.fieldTotalMembers"), value: report.auto_data?.members_total },
    { label: t("detail.fieldActiveMembers"), value: report.auto_data?.members_active },
    { label: t("detail.fieldActivities"), value: report.auto_data?.activities_count },
    { label: t("detail.fieldHonorsEarned"), value: report.auto_data?.honors_earned },
    { label: t("detail.fieldClassesCompleted"), value: report.auto_data?.classes_completed },
    {
      label: t("detail.fieldAttendanceRate"),
      value: report.auto_data?.attendance_rate != null
        ? `${Number(report.auto_data.attendance_rate).toFixed(1)}%`
        : null,
    },
  ];

  const snapshotRows: AutoDataRow[] = [
    { label: t("detail.fieldTotalMembers"), value: report.snapshot_data?.members_total },
    { label: t("detail.fieldActiveMembers"), value: report.snapshot_data?.members_active },
    { label: t("detail.fieldActivities"), value: report.snapshot_data?.activities_count },
    { label: t("detail.fieldHonorsEarned"), value: report.snapshot_data?.honors_earned },
    { label: t("detail.fieldClassesCompleted"), value: report.snapshot_data?.classes_completed },
    {
      label: t("detail.fieldAttendanceRate"),
      value: report.snapshot_data?.attendance_rate != null
        ? `${Number(report.snapshot_data.attendance_rate).toFixed(1)}%`
        : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Report meta info */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("detail.labelStatus")}</span>
          <Badge variant={statusVariant}>{t(`status.${report.status}`)}</Badge>
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
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating || submitting}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {isGenerated ? t("detail.actionRegenerate") : t("detail.actionGenerate")}
            </Button>
          )}
          {isGenerated && !isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={generating || submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("detail.actionSendToField")}
            </Button>
          )}
          {(isGenerated || isSubmitted) && (
            <Button
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
            data={report.auto_data}
            title={t("detail.autoDataLiveTitle")}
            noDataMessage={t("detail.noAutoData")}
            autoDataDescription={t("detail.autoDataDescription")}
            rows={autoDataRows}
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
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
