import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { QuarterlyReportDetailClient } from "@/components/periodic-reports/quarterly-report-detail-client";
import { ApiError } from "@/lib/api/client";
import { getAdminQuarterlyReport, type AdminQuarterlyReport } from "@/lib/api/reports";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { parsePositiveInt } from "@/lib/report-search-params";

const SCREEN_ID = "reports-quarterly";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("periodicReports");
  return { title: t("quarterly.detail.metaTitle") };
}

export default async function QuarterlyReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("periodicReports");
  const reportId = parsePositiveInt((await params).id);
  if (!reportId) notFound();

  let report: AdminQuarterlyReport;
  try {
    report = await getAdminQuarterlyReport(reportId);
  } catch (error) {
    // Out-of-scope and missing reports both answer 404. A 403 (PERIODIC_REPORTS_FORBIDDEN
    // for coordinators, or a missing permission) means no access to the module.
    if (error instanceof ApiError && error.status === 403) {
      return <PageAccessForbidden />;
    }
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const period = t("quarterly.period", { quarter: report.quarter, year: report.year });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("quarterly.detail.title", { period })}
        description={report.club?.name ?? undefined}
        breadcrumbs={[
          { label: t("common.breadcrumbReports"), href: "/dashboard/reports" },
          { label: t("quarterly.page.title"), href: "/dashboard/reports/quarterly" },
          { label: period },
        ]}
      />

      {/* Remounts with fresh server data after router.refresh() (e.g. after Recalcular). */}
      <QuarterlyReportDetailClient
        key={`${report.status}-${report.modified_at ?? ""}`}
        report={report}
        canRegenerate={canCapability(user, SCREEN_ID, "regenerate")}
        canDownload={canCapability(user, SCREEN_ID, "download")}
      />
    </div>
  );
}
