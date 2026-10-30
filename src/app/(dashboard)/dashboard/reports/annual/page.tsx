import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { AnnualReportsListClient } from "@/components/periodic-reports/annual-reports-list-client";
import { GenerateAnnualReportButton } from "@/components/periodic-reports/generate-annual-report-dialog";
import { ApiError } from "@/lib/api/client";
import {
  listAdminAnnualReports,
  type AdminAnnualReport,
  type PeriodicReportsPage,
} from "@/lib/api/reports";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { parsePositiveInt } from "@/lib/report-search-params";

const DEFAULT_LIMIT = 20;
const SCREEN_ID = "reports-annual";

interface AnnualReportsPageProps {
  searchParams: Promise<{
    club_id?: string;
    ecclesiastical_year_id?: string;
    status?: string;
    page?: string;
    limit?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("periodicReports");
  return { title: t("annual.page.title") };
}

export default async function AnnualReportsPage({ searchParams }: AnnualReportsPageProps) {
  const user = await requireAdminUser();
  // The layout hides a forbidden page, but it renders in parallel with it:
  // stop here so the page does not call the API for nothing.
  if (!canAccessDashboardPath(user, "/dashboard/reports/annual")) {
    return <PageAccessForbidden />;
  }
  const t = await getTranslations("periodicReports");
  const params = await searchParams;

  const filters = {
    clubId: parsePositiveInt(params.club_id),
    ecclesiasticalYearId: parsePositiveInt(params.ecclesiastical_year_id),
    status: params.status || undefined,
    page: parsePositiveInt(params.page) ?? 1,
    limit: parsePositiveInt(params.limit) ?? DEFAULT_LIMIT,
  };

  let data: PeriodicReportsPage<AdminAnnualReport> | null = null;
  let loadError: { forbidden: boolean } | null = null;
  try {
    data = await listAdminAnnualReports(filters);
  } catch (error) {
    console.error("[AnnualReportsPage] Failed to load annual reports:", error);
    loadError = { forbidden: error instanceof ApiError && error.status === 403 };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("annual.page.title")}
        description={t("annual.page.description")}
        breadcrumbs={[
          { label: t("common.breadcrumbReports"), href: "/dashboard/reports" },
          { label: t("annual.page.title") },
        ]}
        actions={
          canCapability(user, SCREEN_ID, "generate") ? <GenerateAnnualReportButton /> : undefined
        }
      />

      {data ? (
        <AnnualReportsListClient
          data={data}
          searchParams={{
            club_id: filters.clubId ? String(filters.clubId) : undefined,
            ecclesiastical_year_id: filters.ecclesiasticalYearId
              ? String(filters.ecclesiasticalYearId)
              : undefined,
            status: filters.status,
            limit: params.limit ? String(filters.limit) : undefined,
          }}
          canDownload={canCapability(user, SCREEN_ID, "download")}
        />
      ) : (
        <EndpointErrorBanner
          state={loadError?.forbidden ? "forbidden" : "missing"}
          detail={t("common.errors.load")}
        />
      )}
    </div>
  );
}
