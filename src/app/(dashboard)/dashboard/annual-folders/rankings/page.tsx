import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { listLocalFields } from "@/lib/api/geography";
import { listAnnualRankings } from "@/lib/api/annual-rankings";
import { resolveInitialLocalFieldId } from "@/lib/annual-folders/ranking-defaults";
import type { AnnualRankingLeaderboardRow } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

const RankingsClientPage = dynamic(
  () =>
    import("@/components/annual-folders/rankings-client-page").then((m) => ({
      default: m.RankingsClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function RankingsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");

  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let localFields: LocalField[] = [];
  let initialRankings: AnnualRankingLeaderboardRow[] = [];
  let loadError: string | null = null;

  // Load catalogs
  const [clubTypesResult, yearsResult, localFieldsResult] =
    await Promise.allSettled([
      listClubTypes(),
      listEcclesiasticalYears(),
      listLocalFields(),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = Array.isArray(clubTypesResult.value)
      ? clubTypesResult.value
      : (extractArray(clubTypesResult.value) as ClubType[]);
  }

  if (yearsResult.status === "fulfilled") {
    ecclesiasticalYears = Array.isArray(yearsResult.value)
      ? yearsResult.value
      : (extractArray(yearsResult.value) as EcclesiasticalYear[]);
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = Array.isArray(localFieldsResult.value)
      ? localFieldsResult.value
      : (extractArray(localFieldsResult.value) as LocalField[]);
  }

  if (
    clubTypes.length === 0 ||
    ecclesiasticalYears.length === 0 ||
    localFields.length === 0
  ) {
    loadError = t("pageRankings.errorFallback");
  }

  // Pick sensible defaults: first club type, active year (or first)
  const defaultClubTypeId = clubTypes[0]?.club_type_id ?? 1;
  const defaultYearId =
    ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
    ecclesiasticalYears[0]?.ecclesiastical_year_id ??
    1;
  const defaultLocalFieldId = resolveInitialLocalFieldId(user, localFields);

  if (!loadError && defaultLocalFieldId !== undefined) {
    try {
      const rankingsResult = await listAnnualRankings({
        clubTypeId: defaultClubTypeId,
        ecclesiasticalYearId: defaultYearId,
        localFieldId: defaultLocalFieldId,
      });

      initialRankings = Array.isArray(rankingsResult)
        ? rankingsResult
        : (extractArray(rankingsResult) as AnnualRankingLeaderboardRow[]);
    } catch (error) {
      loadError =
        error instanceof ApiError
          ? error.message
          : t("pageRankings.errorFallback");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageRankings.title")}
        description={t("pageRankings.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubTypes.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title={t("pageRankings.emptyTitle")}
          description={t("pageRankings.emptyDescription")}
        />
      )}

      {!loadError && clubTypes.length > 0 && localFields.length > 0 && (
        <RankingsClientPage
          initialRankings={initialRankings}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          localFields={localFields}
          initialClubTypeId={defaultClubTypeId}
          initialYearId={defaultYearId}
          initialLocalFieldId={defaultLocalFieldId}
        />
      )}
    </div>
  );
}
