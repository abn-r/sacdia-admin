import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import { GenerateQuarterlyReportButton } from "@/components/periodic-reports/generate-quarterly-report-dialog";
import { QuarterlyReportsListClient } from "@/components/periodic-reports/quarterly-reports-list-client";
import { ApiError } from "@/lib/api/client";
import {
  listAdminQuarterlyReports,
  type AdminQuarterlyReport,
  type PeriodicReportsPage,
} from "@/lib/api/reports";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { parsePositiveInt } from "@/lib/report-search-params";

const DEFAULT_LIMIT = 20;
const SCREEN_ID = "reports-quarterly";

interface QuarterlyReportsPageProps {
  searchParams: Promise<{
    club_id?: string;
    year?: string;
    quarter?: string;
    status?: string;
    page?: string;
    limit?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("periodicReports");
  return { title: t("quarterly.page.title") };
}

export default async function QuarterlyReportsPage({ searchParams }: QuarterlyReportsPageProps) {
  const user = await requireAdminUser();
  const t = await getTranslations("periodicReports");
  const params = await searchParams;

  const quarter = parsePositiveInt(params.quarter);
  const filters = {
    clubId: parsePositiveInt(params.club_id),
    year: parsePositiveInt(params.year),
    quarter: quarter && quarter <= 4 ? quarter : undefined,
    status: params.status || undefined,
    page: parsePositiveInt(params.page) ?? 1,
    limit: parsePositiveInt(params.limit) ?? DEFAULT_LIMIT,
  };

  let data: PeriodicReportsPage<AdminQuarterlyReport> | null = null;
  let loadError: { forbidden: boolean } | null = null;
  try {
    data = await listAdminQuarterlyReports(filters);
  } catch (error) {
    console.error("[QuarterlyReportsPage] Failed to load quarterly reports:", error);
    loadError = { forbidden: error instanceof ApiError && error.status === 403 };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("quarterly.page.title")}
        description={t("quarterly.page.description")}
        breadcrumbs={[
          { label: t("common.breadcrumbReports"), href: "/dashboard/reports" },
          { label: t("quarterly.page.title") },
        ]}
        actions={
          canCapability(user, SCREEN_ID, "generate") ? <GenerateQuarterlyReportButton /> : undefined
        }
      />

      {data ? (
        <QuarterlyReportsListClient
          data={data}
          searchParams={{
            club_id: filters.clubId ? String(filters.clubId) : undefined,
            year: filters.year ? String(filters.year) : undefined,
            quarter: filters.quarter ? String(filters.quarter) : undefined,
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
