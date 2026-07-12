import { requireAdminUser } from "@/lib/auth/session";
import {
  filterLocalFieldsByTerritory,
  localFieldOptionFromTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { listLocalFields, listUnions } from "@/lib/api/geography";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  listAnnualRankingConfigs,
  listRankingTiers,
  type AnnualRankingConfig,
  type RankingTier,
} from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";

export type RankingConfigPageData = {
  loadError: string | null;
  configs: AnnualRankingConfig[];
  tiers: RankingTier[];
  unions: Union[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  missingCatalogs: boolean;
};

async function listRankingConfigLocalFieldsForScope(
  user: Awaited<ReturnType<typeof requireAdminUser>>,
) {
  const territoryScope = resolveAdminTerritoryScope(user);

  if (territoryScope.level === "local_field") {
    const option = localFieldOptionFromTerritory(territoryScope);
    return option ? [option] : [];
  }

  if (territoryScope.level === "union") {
    return filterLocalFieldsByTerritory(
      await listLocalFields(territoryScope.unionId),
      territoryScope,
    );
  }

  if (territoryScope.level === "division") {
    const unions = await listUnions({ divisionId: territoryScope.divisionId });
    return (
      await Promise.all(unions.map((union) => listLocalFields(union.union_id)))
    ).flat();
  }

  return listLocalFields();
}

async function listRankingConfigUnionsForScope(
  user: Awaited<ReturnType<typeof requireAdminUser>>,
) {
  const territoryScope = resolveAdminTerritoryScope(user);

  if (territoryScope.level === "union") {
    return [
      {
        union_id: territoryScope.unionId,
        name: territoryScope.unionName ?? `Unión #${territoryScope.unionId}`,
        division_id: territoryScope.divisionId ?? undefined,
        country_id: 0,
        active: true,
      },
    ];
  }

  if (territoryScope.level === "division") {
    return listUnions({ divisionId: territoryScope.divisionId });
  }

  if (territoryScope.level === "all") {
    return listUnions();
  }

  return [];
}

export async function loadRankingConfigPageData(): Promise<RankingConfigPageData> {
  const user = await requireAdminUser();

  let loadError: string | null = null;
  let configs: AnnualRankingConfig[] = [];
  let tiers: RankingTier[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];

  const [
    configsResult,
    tiersResult,
    unionsResult,
    localFieldsResult,
    clubTypesResult,
    yearsResult,
  ] = await Promise.allSettled([
    listAnnualRankingConfigs(),
    listRankingTiers(),
    listRankingConfigUnionsForScope(user),
    listRankingConfigLocalFieldsForScope(user),
    listClubTypes(),
    listEcclesiasticalYears(),
  ]);

  if (configsResult.status === "fulfilled") configs = configsResult.value;
  if (tiersResult.status === "fulfilled") tiers = tiersResult.value;
  if (unionsResult.status === "fulfilled") unions = unionsResult.value;
  if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;
  if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
  if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;

  const firstRejected = [
    configsResult,
    tiersResult,
    unionsResult,
    localFieldsResult,
    clubTypesResult,
    yearsResult,
  ].find((result) => result.status === "rejected");

  if (firstRejected?.status === "rejected") {
    loadError =
      firstRejected.reason instanceof ApiError
        ? firstRejected.reason.message
        : "No se pudo cargar la configuración anual de rankings.";
  }

  const missingCatalogs =
    (localFields.length === 0 && unions.length === 0) ||
    clubTypes.length === 0 ||
    ecclesiasticalYears.length === 0;

  return {
    loadError,
    configs,
    tiers,
    unions,
    localFields,
    clubTypes,
    ecclesiasticalYears,
    missingCatalogs,
  };
}
