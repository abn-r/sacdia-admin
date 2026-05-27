import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { listClubTypes } from "@/lib/api/catalogs";
import { listDivisions, listLocalFields, listUnions } from "@/lib/api/geography";
import { listAdminReports } from "@/lib/api/monthly-reports";
import type { AdminReportFilters, AdminReportsPage } from "@/lib/api/monthly-reports";
import type { ClubType } from "@/lib/api/catalogs";
import type { Division, LocalField, Union } from "@/lib/api/geography";
import { ReportsSupervisionClient } from "./_components/reports-supervision-client";

export const revalidate = 60;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SupervisionPageProps {
  searchParams: Promise<{
    division_id?: string;
    union_id?: string;
    club_type_id?: string;
    local_field_id?: string;
    year?: string;
    month?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ReportsSupervisionPage({
  searchParams,
}: SupervisionPageProps) {
  await requireAdminUser();
  const t = await getTranslations("reports");

  const params = await searchParams;

  const currentYear = new Date().getFullYear();
  const selectedDivisionId = params.division_id ? Number(params.division_id) : undefined;
  const selectedUnionId = params.union_id ? Number(params.union_id) : undefined;

  const filters: AdminReportFilters = {
    ...(selectedDivisionId ? { divisionId: selectedDivisionId } : {}),
    ...(selectedUnionId ? { unionId: selectedUnionId } : {}),
    ...(params.club_type_id ? { clubTypeId: Number(params.club_type_id) } : {}),
    ...(params.local_field_id ? { localFieldId: Number(params.local_field_id) } : {}),
    year: params.year ? Number(params.year) : currentYear,
    ...(params.month ? { month: Number(params.month) } : {}),
    ...(params.status ? { status: params.status } : {}),
    page: params.page ? Number(params.page) : 1,
    limit: 20,
  };

  let clubTypes: ClubType[] = [];
  let divisions: Division[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let reportsData: AdminReportsPage = { total: 0, page: 1, limit: 20, items: [] };
  let loadError: string | null = null;

  const [clubTypesResult, divisionsResult, unionsResult, localFieldsResult, reportsResult] =
    await Promise.allSettled([
      listClubTypes(),
      listDivisions(),
      listUnions(selectedDivisionId ? { divisionId: selectedDivisionId } : undefined),
      listLocalFields(selectedUnionId),
      listAdminReports(filters),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  if (divisionsResult.status === "fulfilled") {
    divisions = divisionsResult.value;
  }

  if (unionsResult.status === "fulfilled") {
    unions = unionsResult.value;
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  }

  if (reportsResult.status === "fulfilled") {
    reportsData = reportsResult.value;
  } else {
    console.error(
      "[ReportsSupervisionPage] Failed to load admin reports:",
      reportsResult.reason,
    );
    loadError = t("supervision.error_load_reports");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("supervision.page_title")}
        description={t("supervision.page_description")}
        breadcrumbs={[
          { label: t("supervision.breadcrumb_reports"), href: "/dashboard/reports" },
          { label: t("supervision.breadcrumb_supervision") },
        ]}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubTypes.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t("supervision.empty_no_catalogs_title")}
          description={t("supervision.empty_no_catalogs_description")}
        />
      )}

      {!loadError && (
        <ReportsSupervisionClient
          initialData={reportsData}
          clubTypes={clubTypes}
          divisions={divisions}
          unions={unions}
          localFields={localFields}
          searchParams={params}
        />
      )}
    </div>
  );
}
