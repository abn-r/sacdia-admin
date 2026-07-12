import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { listClubTypes } from "@/lib/api/catalogs";
import { listDivisions, listLocalFields, listUnions } from "@/lib/api/geography";
import {
  applyTerritoryToReportSearchParams,
  filterDivisionsByTerritory,
  filterLocalFieldsByTerritory,
  filterUnionsByTerritory,
  localFieldOptionFromTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
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
  const user = await requireAdminUser();
  const t = await getTranslations("reports");

  const rawParams = await searchParams;
  const territoryScope = resolveAdminTerritoryScope(user);
  const params = applyTerritoryToReportSearchParams(rawParams, territoryScope);

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

  const scopedUnionsFilter =
    territoryScope.level === "division"
      ? { divisionId: territoryScope.divisionId }
      : selectedDivisionId
        ? { divisionId: selectedDivisionId }
        : undefined;
  const scopedLocalFieldsUnionId =
    territoryScope.level === "union"
      ? territoryScope.unionId
      : selectedUnionId;
  const unionsPromise = listUnions(scopedUnionsFilter);
  const localFieldOption = localFieldOptionFromTerritory(territoryScope);
  const localFieldsPromise = (async () => {
    if (territoryScope.level === "local_field") {
      return localFieldOption ? [localFieldOption] : [];
    }

    if (scopedLocalFieldsUnionId) {
      return listLocalFields(scopedLocalFieldsUnionId);
    }

    if (territoryScope.level === "division") {
      const scopedUnions = await unionsPromise;
      return (
        await Promise.all(
          scopedUnions.map((union) => listLocalFields(union.union_id)),
        )
      ).flat();
    }

    return listLocalFields();
  })();

  const [clubTypesResult, divisionsResult, unionsResult, localFieldsResult, reportsResult] =
    await Promise.allSettled([
      listClubTypes(),
      listDivisions(),
      unionsPromise,
      localFieldsPromise,
      listAdminReports(filters),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  if (divisionsResult.status === "fulfilled") {
    divisions = filterDivisionsByTerritory(divisionsResult.value, territoryScope);
  }

  if (unionsResult.status === "fulfilled") {
    unions = filterUnionsByTerritory(unionsResult.value, territoryScope);
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = filterLocalFieldsByTerritory(localFieldsResult.value, territoryScope);
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
          territoryScope={territoryScope}
        />
      )}
    </div>
  );
}
