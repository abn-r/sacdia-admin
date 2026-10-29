import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AnnualReportDetailClient } from "@/components/periodic-reports/annual-report-detail-client";
import { ApiError } from "@/lib/api/client";
import {
  ecclesiasticalYearLabel,
  getAdminAnnualReport,
  type AdminAnnualReport,
} from "@/lib/api/reports";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { parsePositiveInt } from "@/lib/report-search-params";

const SCREEN_ID = "reports-annual";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("periodicReports");
  return { title: t("annual.detail.metaTitle") };
}

export default async function AnnualReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("periodicReports");
  const reportId = parsePositiveInt((await params).id);
  if (!reportId) notFound();

  let report: AdminAnnualReport;
  try {
    report = await getAdminAnnualReport(reportId);
  } catch (error) {
    // Out-of-scope and missing reports both answer 404; 403 means no access to the module.
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const period =
    ecclesiasticalYearLabel(report.ecclesiastical_year) ?? report.computed_data?.year_label ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("annual.detail.title", { period })}
        description={report.club?.name ?? undefined}
        breadcrumbs={[
          { label: t("common.breadcrumbReports"), href: "/dashboard/reports" },
          { label: t("annual.page.title"), href: "/dashboard/reports/annual" },
          { label: period },
        ]}
      />

      {/* Remounts with fresh server data after router.refresh() (e.g. the finalizer name). */}
      <AnnualReportDetailClient
        key={`${report.status}-${report.modified_at ?? ""}`}
        report={report}
        canUpdate={canCapability(user, SCREEN_ID, "update")}
        canFinalize={canCapability(user, SCREEN_ID, "finalize")}
        canDownload={canCapability(user, SCREEN_ID, "download")}
      />
    </div>
  );
}
