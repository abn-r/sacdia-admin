import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { listClubTypes } from "@/lib/api/catalogs";
import { listAdminMemberOfMonth } from "@/lib/api/member-of-month";
import type { AdminMomFilters, AdminMomPage } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { MemberOfMonthSupervisionClient } from "./_components/member-of-month-supervision-client";

export const revalidate = 60;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MemberOfMonthPageProps {
  searchParams: Promise<{
    club_type_id?: string;
    local_field_id?: string;
    club_id?: string;
    section_id?: string;
    year?: string;
    month?: string;
    notified?: string;
    page?: string;
  }>;
}

export default async function MemberOfMonthSupervisionPage({
  searchParams,
}: MemberOfMonthPageProps) {
  const user = await requireAdminUser();
  const t = await getTranslations("member_of_month");
  const territoryScope = resolveAdminTerritoryScope(user);

  const rawParams = await searchParams;
  const params =
    territoryScope.level === "local_field"
      ? { ...rawParams, local_field_id: String(territoryScope.localFieldId) }
      : rawParams;

  const currentYear = new Date().getFullYear();
  const effectiveLocalFieldId =
    territoryScope.level === "local_field"
      ? territoryScope.localFieldId
      : params.local_field_id
        ? Number(params.local_field_id)
        : undefined;

  const filters: AdminMomFilters = {
    ...(params.club_type_id ? { club_type_id: Number(params.club_type_id) } : {}),
    ...(effectiveLocalFieldId ? { local_field_id: effectiveLocalFieldId } : {}),
    ...(params.club_id ? { club_id: Number(params.club_id) } : {}),
    ...(params.section_id ? { section_id: Number(params.section_id) } : {}),
    year: params.year ? Number(params.year) : currentYear,
    ...(params.month ? { month: Number(params.month) } : {}),
    ...(params.notified === "true"
      ? { notified: true }
      : params.notified === "false"
        ? { notified: false }
        : {}),
    page: params.page ? Number(params.page) : 1,
    limit: 20,
  };

  let clubTypes: ClubType[] = [];
  let localFields: LocalField[] = [];
  let momData: AdminMomPage = { total: 0, page: 1, limit: 20, items: [] };
  let loadError: string | null = null;

  const [clubTypesResult, localFieldsResult, momResult] =
    await Promise.allSettled([
      listClubTypes(),
      listLocalFieldsForTerritory(user),
      listAdminMemberOfMonth(filters),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  } else {
    console.error(
      "[MemberOfMonthSupervisionPage] Failed to load scoped local fields:",
      localFieldsResult.reason,
    );
    loadError = loadError ?? t("page.errorFallback");
  }

  if (momResult.status === "fulfilled") {
    momData = momResult.value;
  } else {
    console.error(
      "[MemberOfMonthSupervisionPage] Failed to load admin MoM list:",
      momResult.reason,
    );
    loadError = t("page.errorFallback");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        breadcrumbs={[
          { label: t("page.breadcrumbParent"), href: t("page.breadcrumbParentHref") },
          { label: t("page.breadcrumbLabel") },
        ]}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubTypes.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={t("page.emptyNoTypesTitle")}
          description={t("page.emptyNoTypesDescription")}
        />
      )}

      {!loadError && (
        <MemberOfMonthSupervisionClient
          initialData={momData}
          clubTypes={clubTypes}
          localFields={localFields}
          territoryScope={territoryScope}
          searchParams={params}
        />
      )}
    </div>
  );
}
