import { ApiError } from "@/lib/api/client";
import { fetchRankingBreakdown, getFolder, listTemplates, type AnnualFolder, type FolderTemplate, type RankingBreakdown } from "@/lib/api/annual-folders";
import {
  listAnnualRankingConfigs,
  listAnnualRankings,
  type AnnualRankingConfig,
  type AnnualRankingLeaderboardRow,
} from "@/lib/api/annual-rankings";
import { listClubTypes, listEcclesiasticalYears, type ClubType, type EcclesiasticalYear } from "@/lib/api/catalogs";
import { listLocalFields, listUnions, type LocalField, type Union } from "@/lib/api/geography";
import { resolveInitialLocalFieldId } from "@/lib/annual-folders/ranking-defaults";
import { extractRoles } from "@/lib/auth/roles";
import {
  filterLocalFieldsByTerritory,
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  localFieldOptionFromTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

async function listRankingLocalFieldsForScope(user: AuthUser): Promise<LocalField[]> {
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
    const fields = (
      await Promise.all(unions.map((union) => listLocalFields(union.union_id)))
    ).flat();
    return fields;
  }

  return listLocalFields();
}

export function parseAnnualFoldersSearchParams(
  raw: Record<string, string | string[] | undefined>,
) {
  const value = raw.folder;
  const folderId =
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

  return { folderId };
}

export type AnnualFoldersHubResult = {
  folderId: string | null;
  folder: AnnualFolder | null;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  unions: Union[];
  localFields: LocalField[];
  currentUserRoles: string[];
  error: { message: string; status: number | null } | null;
};

export async function loadAnnualFoldersHub(
  user: AuthUser,
  folderId: string | null,
): Promise<AnnualFoldersHubResult> {
  const currentUserRoles = extractRoles(user);

  if (!folderId) {
    const [clubTypesResult, yearsResult, unionsResult, localFieldsResult] =
      await Promise.allSettled([
        listClubTypes(),
        listEcclesiasticalYears(),
        listUnionsForTerritory(user),
        listLocalFieldsForTerritory(user),
      ]);

    return {
      folderId: null,
      folder: null,
      clubTypes: clubTypesResult.status === "fulfilled" ? clubTypesResult.value : [],
      ecclesiasticalYears: yearsResult.status === "fulfilled" ? yearsResult.value : [],
      unions: unionsResult.status === "fulfilled" ? unionsResult.value : [],
      localFields: localFieldsResult.status === "fulfilled" ? localFieldsResult.value : [],
      currentUserRoles,
      error: null,
    };
  }

  try {
    const folder = await getFolder(folderId);
    return {
      folderId,
      folder,
      clubTypes: [],
      ecclesiasticalYears: [],
      unions: [],
      localFields: [],
      currentUserRoles,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        folderId,
        folder: null,
        clubTypes: [],
        ecclesiasticalYears: [],
        unions: [],
        localFields: [],
        currentUserRoles,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      folderId,
      folder: null,
      clubTypes: [],
      ecclesiasticalYears: [],
      unions: [],
      localFields: [],
      currentUserRoles,
      error: { message: "", status: null },
    };
  }
}

export type AnnualFoldersRankingsResult = {
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  localFields: LocalField[];
  initialRankings: AnnualRankingLeaderboardRow[];
  defaultClubTypeId: number;
  defaultYearId: number;
  defaultLocalFieldId: number | undefined;
  error: { message: string; status: number | null } | null;
};

export async function loadAnnualFoldersRankings(
  user: AuthUser,
): Promise<AnnualFoldersRankingsResult> {
  const empty = {
    clubTypes: [] as ClubType[],
    ecclesiasticalYears: [] as EcclesiasticalYear[],
    localFields: [] as LocalField[],
    initialRankings: [] as AnnualRankingLeaderboardRow[],
    defaultClubTypeId: 1,
    defaultYearId: 1,
    defaultLocalFieldId: undefined as number | undefined,
    error: null as { message: string; status: number | null } | null,
  };

  const [clubTypesResult, yearsResult, localFieldsResult] = await Promise.allSettled([
    listClubTypes(),
    listEcclesiasticalYears(),
    listRankingLocalFieldsForScope(user),
  ]);

  const clubTypes =
    clubTypesResult.status === "fulfilled"
      ? Array.isArray(clubTypesResult.value)
        ? clubTypesResult.value
        : (extractArray(clubTypesResult.value) as ClubType[])
      : [];

  const ecclesiasticalYears =
    yearsResult.status === "fulfilled"
      ? Array.isArray(yearsResult.value)
        ? yearsResult.value
        : (extractArray(yearsResult.value) as EcclesiasticalYear[])
      : [];

  const localFields =
    localFieldsResult.status === "fulfilled"
      ? Array.isArray(localFieldsResult.value)
        ? localFieldsResult.value
        : (extractArray(localFieldsResult.value) as LocalField[])
      : [];

  const defaultClubTypeId = clubTypes[0]?.club_type_id ?? 1;
  const defaultYearId =
    ecclesiasticalYears.find((year) => year.active)?.ecclesiastical_year_id ??
    ecclesiasticalYears[0]?.ecclesiastical_year_id ??
    1;
  const defaultLocalFieldId = resolveInitialLocalFieldId(user, localFields);

  if (
    clubTypes.length === 0 ||
    ecclesiasticalYears.length === 0 ||
    localFields.length === 0
  ) {
    return {
      ...empty,
      clubTypes,
      ecclesiasticalYears,
      localFields,
      defaultClubTypeId,
      defaultYearId,
      defaultLocalFieldId,
      error: { message: "", status: null },
    };
  }

  if (defaultLocalFieldId === undefined) {
    return {
      ...empty,
      clubTypes,
      ecclesiasticalYears,
      localFields,
      defaultClubTypeId,
      defaultYearId,
      error: { message: "", status: null },
    };
  }

  try {
    const rankingsResult = await listAnnualRankings({
      clubTypeId: defaultClubTypeId,
      ecclesiasticalYearId: defaultYearId,
      localFieldId: defaultLocalFieldId,
    });

    const initialRankings = Array.isArray(rankingsResult)
      ? rankingsResult
      : (extractArray(rankingsResult) as AnnualRankingLeaderboardRow[]);

    return {
      clubTypes,
      ecclesiasticalYears,
      localFields,
      initialRankings,
      defaultClubTypeId,
      defaultYearId,
      defaultLocalFieldId,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        clubTypes,
        ecclesiasticalYears,
        localFields,
        initialRankings: [],
        defaultClubTypeId,
        defaultYearId,
        defaultLocalFieldId,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      clubTypes,
      ecclesiasticalYears,
      localFields,
      initialRankings: [],
      defaultClubTypeId,
      defaultYearId,
      defaultLocalFieldId,
      error: { message: "", status: null },
    };
  }
}

export type AnnualFoldersTemplatesResult = {
  templates: FolderTemplate[];
  rankingConfigs: AnnualRankingConfig[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  unions: Union[];
  localFields: LocalField[];
  territoryScope: ReturnType<typeof resolveAdminTerritoryScope>;
  error: { message: string; status: number | null } | null;
};

export async function loadAnnualFoldersTemplates(
  user: AuthUser,
): Promise<AnnualFoldersTemplatesResult> {
  const territoryScope = resolveAdminTerritoryScope(user);

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

  let error: { message: string; status: number | null } | null = null;

  const templates =
    templatesResult.status === "fulfilled"
      ? Array.isArray(templatesResult.value)
        ? templatesResult.value
        : (extractArray(templatesResult.value) as FolderTemplate[])
      : (() => {
          const err = templatesResult.reason;
          if (err instanceof ApiError) {
            error = { message: err.message, status: err.status };
          }
          return [];
        })();

  const rankingConfigs =
    rankingConfigsResult.status === "fulfilled"
      ? rankingConfigsResult.value
      : (() => {
          if (!error) error = { message: "", status: null };
          return [] as AnnualRankingConfig[];
        })();

  const clubTypes =
    clubTypesResult.status === "fulfilled"
      ? Array.isArray(clubTypesResult.value)
        ? clubTypesResult.value
        : (extractArray(clubTypesResult.value) as ClubType[])
      : [];

  const ecclesiasticalYears =
    yearsResult.status === "fulfilled"
      ? Array.isArray(yearsResult.value)
        ? yearsResult.value
        : (extractArray(yearsResult.value) as EcclesiasticalYear[])
      : [];

  const unions = unionsResult.status === "fulfilled" ? unionsResult.value : [];
  const localFields =
    localFieldsResult.status === "fulfilled" ? localFieldsResult.value : [];

  if (
    (unionsResult.status === "rejected" ||
      localFieldsResult.status === "rejected" ||
      rankingConfigsResult.status === "rejected") &&
    !error
  ) {
    error = { message: "", status: null };
  }

  return {
    templates,
    rankingConfigs,
    clubTypes,
    ecclesiasticalYears,
    unions,
    localFields,
    territoryScope,
    error,
  };
}

export { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";
export type { RankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export type RankingBreakdownResult = {
  data: RankingBreakdown | null;
  error: { message: string; status: number | null } | null;
};

export async function loadAnnualFoldersRankingBreakdown(
  enrollmentId: string,
  yearId: number,
): Promise<RankingBreakdownResult> {
  try {
    const data = await fetchRankingBreakdown(enrollmentId, yearId);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        data: null,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      data: null,
      error: { message: "", status: null },
    };
  }
}
