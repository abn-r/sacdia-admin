import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnnualProgressClientPage } from "@/components/annual-rankings/annual-progress-client-page";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { resolveInitialLocalFieldId } from "@/lib/annual-folders/ranking-defaults";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { listLocalFields, listUnions } from "@/lib/api/geography";
import { listAnnualRankings, type AnnualRankingLeaderboardRow } from "@/lib/api/annual-rankings";
import {
  filterLocalFieldsByTerritory,
  localFieldOptionFromTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { requireAdminUser } from "@/lib/auth/session";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

type AnyRecord = Record<string, unknown>;

function extractArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

async function listRankingLocalFieldsForScope(user: Awaited<ReturnType<typeof requireAdminUser>>) {
  const territoryScope = resolveAdminTerritoryScope(user);

  if (territoryScope.level === "local_field") {
    const option = localFieldOptionFromTerritory(territoryScope);
    return option ? [option] : [];
  }

  if (territoryScope.level === "union") {
    return filterLocalFieldsByTerritory(await listLocalFields(territoryScope.unionId), territoryScope);
  }

  if (territoryScope.level === "division") {
    const unions = await listUnions({ divisionId: territoryScope.divisionId });
    return (await Promise.all(unions.map((union) => listLocalFields(union.union_id)))).flat();
  }

  return listLocalFields();
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.progress.annual");
  return { title: t("title") };
}

export default async function AnnualProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ local_field?: string }>;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("evaluation.progress.annual");
  const { local_field: localFieldParam } = await searchParams;

  const [clubTypesResult, yearsResult, localFieldsResult] = await Promise.allSettled([
    listClubTypes(),
    listEcclesiasticalYears(),
    listRankingLocalFieldsForScope(user),
  ]);

  const rejected = [clubTypesResult, yearsResult, localFieldsResult].find((r) => r.status === "rejected");
  if (rejected?.status === "rejected") {
    const failure = errorStateFromError(rejected.reason);
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />
        <ErrorState kind={failure.kind} detail={failure.detail} retry />
      </div>
    );
  }

  const clubTypes = clubTypesResult.status === "fulfilled" ? extractArray<ClubType>(clubTypesResult.value) : [];
  const years =
    yearsResult.status === "fulfilled" ? extractArray<EcclesiasticalYear>(yearsResult.value) : [];
  const localFields =
    localFieldsResult.status === "fulfilled" ? extractArray<LocalField>(localFieldsResult.value) : [];

  if (clubTypes.length === 0 || years.length === 0 || localFields.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />
        <EmptyState icon={TrendingUp} title={t("noCatalogs.title")} description={t("noCatalogs.description")} />
      </div>
    );
  }

  const clubTypeId = clubTypes[0]?.club_type_id ?? 1;
  const yearId =
    years.find((y) => y.active)?.ecclesiastical_year_id ?? years[0]?.ecclesiastical_year_id ?? 1;
  const requestedField = Number(localFieldParam);
  const localFieldId = localFields.some((f) => f.local_field_id === requestedField)
    ? requestedField
    : resolveInitialLocalFieldId(user, localFields);

  let rows: AnnualRankingLeaderboardRow[] = [];
  let initialError: ErrorStateFromError | null = null;
  if (localFieldId !== undefined) {
    try {
      rows = extractArray<AnnualRankingLeaderboardRow>(
        await listAnnualRankings({ clubTypeId, ecclesiasticalYearId: yearId, localFieldId }),
      );
    } catch (error) {
      initialError = errorStateFromError(error);
    }
  }

  return (
    <AnnualProgressClientPage
      initialRows={rows}
      initialError={initialError}
      clubTypes={clubTypes}
      ecclesiasticalYears={years}
      localFields={localFields}
      initialClubTypeId={clubTypeId}
      initialYearId={yearId}
      initialLocalFieldId={localFieldId}
    />
  );
}
