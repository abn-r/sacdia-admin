import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ReportDetailClient } from "@/components/reports/report-detail-client";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import type { MonthlyReport } from "@/lib/api/monthly-reports";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ reportId: string }>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

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

  const monthName = MONTH_NAMES[report.month] ?? String(report.month);
  const pageTitle = `Reporte ${monthName} ${report.year}`;

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description="Visualiza y edita los datos del reporte mensual.">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="size-4" />
            Volver a reportes
          </Link>
        </Button>
      </PageHeader>

      <ReportDetailClient report={report} />
    </div>
  );
}
