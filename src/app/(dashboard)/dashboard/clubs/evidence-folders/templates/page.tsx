import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalField, Union } from "@/lib/api/geography";
import { ApiError } from "@/lib/api/client";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { listTemplates, type FolderTemplate } from "@/lib/api/annual-folders";
import {
  listAnnualRankingConfigs,
  type AnnualRankingConfig,
} from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

const TemplatesClientPage = dynamic(
  () =>
    import("@/components/annual-folders/templates-client-page").then((m) => ({
      default: m.TemplatesClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="rounded-xl border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b px-4 py-4 last:border-0"
            >
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
);

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

export default async function ClubsEvidenceFolderTemplatesPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");
  const territoryScope = resolveAdminTerritoryScope(user);

  let templates: FolderTemplate[] = [];
  let rankingConfigs: AnnualRankingConfig[] = [];
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let loadError: string | null = null;

  const [
    templatesResult,
    rankingConfigsResult,
    clubTypesResult,
    yearsResult,
    unionsResult,
    localFieldsResult,
  ] = await Promise.allSettled([
    listTemplates(),
    listAnnualRankingConfigs(),
    listClubTypes(),
    listEcclesiasticalYears(),
    listUnionsForTerritory(user),
    listLocalFieldsForTerritory(user),
  ]);

  if (templatesResult.status === "fulfilled") {
    templates = Array.isArray(templatesResult.value)
      ? templatesResult.value
      : (extractArray(templatesResult.value) as FolderTemplate[]);
  } else {
    const err = templatesResult.reason;
    loadError =
      err instanceof ApiError ? err.message : t("pageTemplates.errorFallback");
  }

  if (rankingConfigsResult.status === "fulfilled") {
    rankingConfigs = rankingConfigsResult.value;
  } else {
    loadError = loadError ?? t("pageTemplates.errorFallback");
  }

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

  if (unionsResult.status === "fulfilled") {
    unions = unionsResult.value;
  } else {
    loadError = loadError ?? t("pageTemplates.errorFallback");
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  } else {
    loadError = loadError ?? t("pageTemplates.errorFallback");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTemplates.title")}
        description={t("pageTemplates.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && (
        <TemplatesClientPage
          initialTemplates={templates}
          rankingConfigs={rankingConfigs}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          unions={unions}
          localFields={localFields}
          territoryScope={territoryScope}
        />
      )}
    </div>
  );
}
