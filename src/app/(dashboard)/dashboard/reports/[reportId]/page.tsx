import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ReportDetailClient } from "@/components/reports/report-detail-client";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getMonthlyReport,
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

  const monthName = t(`months.${report.month}` as Parameters<typeof t>[0]) ?? String(report.month);
  const pageTitle = `Reporte ${monthName} ${report.year}`;

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={t("pageDetail.description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="size-4" />
            {t("pageDetail.back_link")}
          </Link>
        </Button>
      </PageHeader>

      <ReportDetailClient report={report} />
    </div>
  );
}
