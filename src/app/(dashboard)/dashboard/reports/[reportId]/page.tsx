import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.reports");
  return { title: t("detail.metaTitle") };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportDetailPage({ params }: { params: Params }) {
  await requireAdminUser();
  const { reportId: reportIdStr } = await params;

  const reportId = reportIdStr.trim();
  if (!reportId) {
    notFound();
  }

  let report: MonthlyReport;
  try {
    report = await getMonthlyReport(reportId);
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
  // their frozen snapshot; drafts show the live preview. If the preview fails the
  // detail says so instead of showing "no data".
  let previewFailed = false;
  if (report.status === "draft" && !report.auto_data) {
    try {
      const preview = await previewMonthlyReport(
        report.enrollment_id,
        report.month,
        report.year,
      );
      report = { ...report, auto_data: preview.auto_data };
    } catch (error) {
      console.error("[ReportDetailPage] Failed to load the draft preview:", error);
      previewFailed = true;
    }
  }

  return <ReportDetailClient report={report} previewFailed={previewFailed} />;
}
