"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Inbox, RefreshCw, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailHeader } from "@/components/shared/detail-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RowActions } from "@/components/shared/row-actions";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { ManualDataForm } from "@/components/reports/manual-data-form";
import { MonthlyReportStatus } from "@/components/reports/monthly-report-status";
import {
  generateReport,
  regenerateReport,
  submitReport,
  triggerMonthlyReportPdfDownload,
  waitForMonthlyReport,
  type MonthlyReport,
  type MonthlyReportJobResult,
} from "@/lib/api/monthly-reports";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import { useToastError } from "@/lib/feedback/toast-retry";
import { frozenNote, monthlyReportClubParts } from "@/lib/reports/detail";
import { reportsTabHref } from "@/lib/reports/tabs";
import {
  hasReportAutoData,
  readReportAutoData,
  type ReportAutoSummary,
} from "@/components/reports/report-auto-data";

const DAY_OPTIONS: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const MOMENT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

interface Fact {
  label: string;
  value: unknown;
}

/** A titled block of label/value pairs. Sections, not cards. */
function DataSection({ title, facts }: { title: string; facts: Fact[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {value != null && value !== "" ? String(value) : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ListSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; primary: string; secondary?: string | undefined }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <ul className="divide-y text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-4 py-2">
            <span className="font-medium">{item.primary}</span>
            {item.secondary ? <span className="text-xs text-muted-foreground">{item.secondary}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ReportDetailClientProps {
  report: MonthlyReport;
  /** The draft preview could not be computed: say so instead of showing "no data". */
  previewFailed?: boolean;
}

export function ReportDetailClient({ report: initialReport, previewFailed = false }: ReportDetailClientProps) {
  const t = useTranslations("evaluation.reports");
  const tr = useTranslations("reports");
  const router = useRouter();
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const toastError = useToastError();
  const tab = useUrlTab("tab", "system");
  const [report, setReport] = useState<MonthlyReport>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isDraft = report.status === "draft";
  const isGenerated = report.status === "generated";
  const isSubmitted = report.status === "submitted";
  const monthName = tr(`months.${report.month}` as Parameters<typeof tr>[0]);
  const period = `${monthName} ${report.year}`;
  const { club, type } = monthlyReportClubParts(report);
  const clubLabel = club && type ? `${club} (${type})` : (club ?? type);
  const title = [period, club, type].filter(Boolean).join(" · ");

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
        toast.loading(tr(regenerating ? "toasts.report_regenerating" : "toasts.report_generating"), { id: toastId });
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
          toast.dismiss(toastId);
          toastError({ title: tr("errors.job_timeout") });
          return;
        }
      } else {
        fresh = result.report;
      }

      setReport(fresh);
      toast.success(tr(regenerating ? "toasts.report_regenerated" : "toasts.report_generated"), { id: toastId });
      router.refresh();
    } catch (error) {
      toast.dismiss(toastId);
      toastError({
        title: tr("errors.generate_report"),
        ...(error instanceof Error && error.message ? { description: error.message } : {}),
        onRetry: () => void handleGenerate(),
      });
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [isGenerated, report.report_id, report.pdf_generated_at, router, tr, toastError]);

  const handleSubmit = useCallback(async () => {
    // A failure rejects: the confirmation stays open and says why.
    const updated = await submitReport(report.report_id);
    setReport(updated);
    toast.success(tr("toasts.report_sent"));
    router.refresh();
  }, [report.report_id, router, tr]);

  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    try {
      await triggerMonthlyReportPdfDownload(report.report_id);
    } catch (error) {
      toastError({
        title: t("errors.download"),
        ...(error instanceof Error && error.message ? { description: error.message } : {}),
        onRetry: () => void handleDownloadPdf(),
      });
    } finally {
      setDownloadingPdf(false);
    }
  }, [report.report_id, t, toastError]);

  const num = (value: number | null) => (value !== null ? formatNumber(value) : null);
  const factsOf = (summary: ReportAutoSummary) => {
    const clubRows: Fact[] = [
      { label: tr("detail.fieldTotalMembers"), value: num(summary.members) },
      ...(summary.membersActive !== null
        ? [{ label: tr("detail.fieldActiveMembers"), value: num(summary.membersActive) }]
        : []),
      { label: tr("detail.fieldActivities"), value: num(summary.activities) },
      { label: tr("detail.fieldHonorsStarted"), value: num(summary.honorsStarted) },
      { label: tr("detail.fieldHonorsCompleted"), value: num(summary.honorsCompleted) },
      ...(summary.classesCompleted !== null
        ? [{ label: tr("detail.fieldClassesCompleted"), value: num(summary.classesCompleted) }]
        : []),
      ...(summary.attendanceRate !== null
        ? [{ label: tr("detail.fieldAttendanceRate"), value: `${summary.attendanceRate.toFixed(1)}%` }]
        : []),
      { label: tr("detail.fieldMeetingDays"), value: summary.meetingDays },
    ];
    const finances: Fact[] = [
      { label: tr("detail.fieldIncome"), value: num(summary.income) },
      { label: tr("detail.fieldExpenses"), value: num(summary.expenses) },
      { label: tr("detail.fieldBalance"), value: num(summary.balance) },
      { label: tr("detail.fieldTotalBalance"), value: num(summary.totalBalance) },
      { label: tr("detail.fieldTransactions"), value: num(summary.transactions) },
    ];
    return { club: clubRows, finances };
  };

  // GET :id returns the frozen snapshot but no live auto_data: a generated or
  // sent report reads its snapshot; a draft reads the live preview.
  const data = report.auto_data ?? report.snapshot_data ?? null;
  const summary = readReportAutoData(data);
  const { club: clubFacts, finances: financeFacts } = factsOf(summary);
  const formatDay = (value: string) => formatDateTime(value, DAY_OPTIONS);
  const dated = (value?: string | null) => (value ? formatDay(value) : undefined);

  const note = frozenNote(report);
  let subtitle: string;
  if (note.kind === "live") subtitle = t("detail.subtitleDraft");
  else if (note.kind === "frozenNoDate") subtitle = t("detail.subtitleFrozenNoDate");
  else if (note.submittedAt)
    subtitle = t("detail.subtitleSent", {
      generated: formatDateTime(note.generatedAt, MOMENT_OPTIONS),
      sent: formatDateTime(note.submittedAt, MOMENT_OPTIONS),
    });
  else subtitle = t("detail.subtitleFrozen", { date: formatDateTime(note.generatedAt, MOMENT_OPTIONS) });

  const actions: ReactNode = (
    <>
      {isDraft && (
        <Button size="sm" loading={generating} onClick={() => void handleGenerate()}>
          <Zap aria-hidden="true" />
          {tr("detail.actionGenerate")}
        </Button>
      )}
      {(isGenerated || isSubmitted) && (
        <Button
          size="sm"
          variant="outline"
          loading={downloadingPdf}
          disabled={generating}
          onClick={() => void handleDownloadPdf()}
        >
          <Download aria-hidden="true" />
          {tr("detail.actionDownloadPdf")}
        </Button>
      )}
      {isGenerated && (
        <Button size="sm" disabled={generating} onClick={() => setConfirmSendOpen(true)}>
          <Send aria-hidden="true" />
          {t("detail.actionSend")}
        </Button>
      )}
      {isGenerated && (
        <RowActions
          label={period}
          actions={[
            {
              label: tr("detail.actionRegenerate"),
              icon: RefreshCw,
              onSelect: () => void handleGenerate(),
              disabled: generating,
            },
          ]}
        />
      )}
    </>
  );

  let systemTab: ReactNode;
  if (!hasReportAutoData(data)) {
    systemTab =
      isDraft && previewFailed ? (
        <ErrorState variant="inline" retry />
      ) : (
        <EmptyState icon={Inbox} title={tr("detail.noAutoData")} />
      );
  } else {
    systemTab = (
      <div className="space-y-8">
        <DataSection title={t("detail.sectionClub")} facts={clubFacts} />
        <DataSection title={t("detail.sectionFinances")} facts={financeFacts} />
        <ListSection
          title={tr("detail.sectionDirectiva")}
          items={summary.directiva.map((member, index) => ({
            key: `${member.user_id ?? "member"}-${index}`,
            primary: member.name ?? "—",
            secondary: member.role ?? undefined,
          }))}
        />
        <ListSection
          title={tr("detail.sectionActivities")}
          items={summary.activityList.map((activity, index) => ({
            key: `${activity.activity_id ?? "activity"}-${index}`,
            primary: activity.name ?? "—",
            secondary: [activity.type, dated(activity.date)].filter(Boolean).join(" · ") || undefined,
          }))}
        />
        <ListSection
          title={tr("detail.sectionHonors")}
          items={summary.honorDetails.map((honor, index) => ({
            key: `${honor.honor_name ?? "honor"}-${index}`,
            primary: [honor.honor_name, honor.user_name].filter(Boolean).join(" — ") || "—",
            secondary:
              [honor.validated ? tr("detail.honorValidated") : tr("detail.honorPending"), dated(honor.date)]
                .filter(Boolean)
                .join(" · ") || undefined,
          }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { label: t("page.title"), href: "/dashboard/reports" },
          { label: t("tabs.monthly"), href: reportsTabHref("monthly") },
          { label: period },
        ]}
        title={title}
        subtitle={subtitle}
        facts={[{ label: t("detail.statusLabel"), value: <MonthlyReportStatus status={report.status} /> }]}
        actions={actions}
      />

      <UrlTabs
        ariaLabel={t("detail.tabsLabel")}
        defaultValue="system"
        tabs={[
          { value: "system", label: t("detail.tabSystem") },
          { value: "club", label: t("detail.tabClub") },
        ]}
      />

      {tab === "club" ? (
        <ManualDataForm
          reportId={report.report_id}
          initialData={report.manual_data}
          disabled={isSubmitted}
          onSuccess={() => {
            toast.success(tr("toasts.data_updated"));
          }}
        />
      ) : (
        systemTab
      )}

      <ConfirmDialog
        open={confirmSendOpen}
        onOpenChange={setConfirmSendOpen}
        title={tr("detail.sendConfirmTitle")}
        description={
          clubLabel
            ? tr("detail.sendConfirmDescription", { period, club: clubLabel })
            : tr("detail.sendConfirmDescriptionNoClub", { period })
        }
        confirmLabel={tr("detail.actionSendToField")}
        cancelLabel={tr("detail.sendConfirmCancel")}
        onConfirm={handleSubmit}
      />
    </div>
  );
}
