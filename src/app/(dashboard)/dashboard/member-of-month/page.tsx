import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { requireAdminUser } from "@/lib/auth/session";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { listClubTypes } from "@/lib/api/catalogs";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
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
    limit?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.progress.memberOfMonth");
  return { title: t("title") };
}

export default async function MemberOfMonthSupervisionPage({
  searchParams,
}: MemberOfMonthPageProps) {
  const user = await requireAdminUser();
  // The layout hides a forbidden page, but it renders in parallel with it:
  // stop here so the page does not call the API for nothing.
  if (!canAccessDashboardPath(user, "/dashboard/member-of-month")) {
    return <PageAccessForbidden />;
  }
  const t = await getTranslations("evaluation.progress.memberOfMonth");
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
    limit: Math.min(Math.max(Number(params.limit) || 20, 1), 100),
  };

  let clubTypes: ClubType[] = [];
  let localFields: LocalField[] = [];
  let momData: AdminMomPage = { total: 0, page: 1, limit: 20, items: [] };
  let loadError: ErrorStateFromError | null = null;

  const [clubTypesResult, localFieldsResult, momResult] =
    await Promise.allSettled([
      listClubTypes(),
      listLocalFieldsForTerritory(user),
      listAdminMemberOfMonth(filters),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  // Without the territory list the picker is empty, but the winners still load.
  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  }

  if (momResult.status === "fulfilled") {
    momData = momResult.value;
  } else {
    loadError = errorStateFromError(momResult.reason);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {loadError ? (
        <ErrorState kind={loadError.kind} detail={loadError.detail} retry />
      ) : (
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
