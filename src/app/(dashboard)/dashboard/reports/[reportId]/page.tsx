import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ReportDetailClient } from "@/components/reports/report-detail-client";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getMonthlyReport,
  previewMonthlyReport,
  type MonthlyReport,
} from "@/lib/api/monthly-reports";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ reportId: string }>;

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchReport(reportId: string): Promise<MonthlyReport> {
  return getMonthlyReport(reportId);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportDetailPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("reports");
  const { reportId: reportIdStr } = await params;

  const reportId = reportIdStr.trim();
  if (!reportId) {
    notFound();
  }

  let report: MonthlyReport;
  try {
    report = await fetchReport(reportId);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  // The GET :id payload carries no `auto_data`. Generated/submitted reports show
  // their frozen snapshot; drafts show the live preview (best effort).
  if (report.status === "draft" && !report.auto_data) {
    try {
      const preview = await previewMonthlyReport(
        report.enrollment_id,
        report.month,
        report.year,
      );
      report = { ...report, auto_data: preview.auto_data };
    } catch {
      // Preview is optional: the auto tab falls back to its empty state.
    }
  }

  const monthName = t(`months.${report.month}` as Parameters<typeof t>[0]) ?? String(report.month);
  const pageTitle = `Reporte ${monthName} ${report.year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={t("pageDetail.description")}
        breadcrumbs={[
          { label: t("page.title"), href: "/dashboard/reports" },
          { label: pageTitle },
        ]}
      />

      <ReportDetailClient report={report} />
    </div>
  );
}
