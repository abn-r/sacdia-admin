import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ReportDetailClient } from "@/components/reports/report-detail-client";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import type { MonthlyReport } from "@/lib/api/monthly-reports";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ reportId: string }>;

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchReport(reportId: number): Promise<MonthlyReport> {
  const payload = await apiRequest<unknown>(`/monthly-reports/${reportId}`);

  // Normalize envelope { data: {...} } vs raw object
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload;

  return data as MonthlyReport;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportDetailPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("reports");
  const { reportId: reportIdStr } = await params;

  const reportId = Number(reportIdStr);
  if (!Number.isFinite(reportId) || reportId <= 0) {
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
