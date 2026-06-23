import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import type {
  AnnualRankingConfigFormValues,
  RankingTierFormValues,
} from "@/lib/annual-rankings/annual-ranking-config-validation";

export type AnnualRankingComponentConfig = {
  annual_ranking_component_config_id?: string;
  annual_ranking_config_id?: string;
  annual_ranking_axis_config_id?: string | null;
  component_key: string;
  label: string;
  max_points: number;
  sort_order: number;
  active?: boolean;
};

export type AnnualRankingAxisConfig = {
  annual_ranking_axis_config_id?: string;
  annual_ranking_config_id?: string;
  axis_key: string;
  label: string;
  max_points: number;
  sort_order: number;
  active?: boolean;
  components: AnnualRankingComponentConfig[];
};

export type AnnualRankingConfig = {
  annual_ranking_config_id: string;
  union_id: number | null;
  local_field_id: number | null;
  ecclesiastical_year_id: number;
  club_type_id: number;
  max_points: number;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  union?: { union_id: number; name: string } | null;
  local_field?: { local_field_id: number; name: string; union_id: number } | null;
  axes?: AnnualRankingAxisConfig[];
  components: AnnualRankingComponentConfig[];
};

export type RankingTier = {
  ranking_tier_id: string;
  name: string;
  slug: string;
  band_percentage: number;
  color: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AnnualRankingTier = {
  name: string;
  slug: string;
  from_points: number;
  to_points: number;
  points_to_reach: number | null;
};

export type AnnualRankingComponentProgress = {
  key: string;
  label: string;
  earned_points: number;
  max_points: number;
  progress_percentage: number;
};

export type AnnualRankingAxisProgress = {
  key: string;
  label: string;
  earned_points: number;
  max_points: number;
  progress_percentage: number;
  components: AnnualRankingComponentProgress[];
};

export type AnnualRankingLeaderboardRow = {
  rank_position: number;
  club_enrollment_id: string;
  club_id: number;
  club_name: string;
  club_type_id: number;
  ecclesiastical_year_id: number;
  local_field_id: number | null;
  current_points: number;
  max_points: number;
  progress_percentage: number;
  current_tier: AnnualRankingTier | null;
  next_tier: AnnualRankingTier | null;
  axes: AnnualRankingAxisProgress[];
  components: AnnualRankingComponentProgress[];
};

type Envelope<T> = { status?: string; data?: T; total?: number };

function unwrapData<T>(payload: T | Envelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as Envelope<T>).data as T;
  }
  return payload as T;
}

export type AnnualRankingConfigFilters = {
  unionId?: number;
  localFieldId?: number;
  ecclesiasticalYearId?: number;
  clubTypeId?: number;
};

export type AnnualRankingLeaderboardFilters = {
  localFieldId: number;
  ecclesiasticalYearId: number;
  clubTypeId: number;
};

function filtersToParams(filters: AnnualRankingConfigFilters = {}) {
  return {
    union_id: filters.unionId,
    local_field_id: filters.localFieldId,
    year_id: filters.ecclesiasticalYearId,
    club_type_id: filters.clubTypeId,
  };
}

function toAnnualRankingConfigPayload(values: AnnualRankingConfigFormValues) {
  return {
    ecclesiastical_year_id: values.ecclesiastical_year_id,
    club_type_id: values.club_type_id,
    max_points: values.max_points,
    axes: values.axes,
    union_id: values.scope_type === "union" ? (values.union_id ?? undefined) : undefined,
    local_field_id:
      values.scope_type === "local_field"
        ? (values.local_field_id ?? undefined)
        : undefined,
  };
}

function leaderboardFiltersToParams(filters: AnnualRankingLeaderboardFilters) {
  return {
    local_field_id: filters.localFieldId,
    year_id: filters.ecclesiasticalYearId,
    club_type_id: filters.clubTypeId,
  };
}

export async function listAnnualRankingConfigs(
  filters: AnnualRankingConfigFilters = {},
): Promise<AnnualRankingConfig[]> {
  const payload = await apiRequest<Envelope<AnnualRankingConfig[]>>(
    "/annual-ranking-configs",
    { params: filtersToParams(filters) },
  );

  return unwrapData(payload) ?? [];
}

export async function listAnnualRankingConfigsFromClient(
  filters: AnnualRankingConfigFilters = {},
): Promise<AnnualRankingConfig[]> {
  const payload = await apiRequestFromClient<Envelope<AnnualRankingConfig[]>>(
    "/annual-ranking-configs",
    { params: filtersToParams(filters) },
  );

  return unwrapData(payload) ?? [];
}

export async function createAnnualRankingConfig(
  payload: AnnualRankingConfigFormValues,
): Promise<AnnualRankingConfig> {
  const response = await apiRequestFromClient<Envelope<AnnualRankingConfig>>(
    "/annual-ranking-configs",
    { method: "POST", body: toAnnualRankingConfigPayload(payload) },
  );

  return unwrapData(response);
}

export async function updateAnnualRankingConfig(
  id: string,
  payload: Pick<AnnualRankingConfigFormValues, "max_points" | "axes">,
): Promise<AnnualRankingConfig> {
  const response = await apiRequestFromClient<Envelope<AnnualRankingConfig>>(
    `/annual-ranking-configs/${id}`,
    { method: "PATCH", body: payload },
  );

  return unwrapData(response);
}

export async function listAnnualRankings(
  filters: AnnualRankingLeaderboardFilters,
): Promise<AnnualRankingLeaderboardRow[]> {
  const payload = await apiRequest<Envelope<AnnualRankingLeaderboardRow[]>>(
    "/annual-rankings",
    { params: leaderboardFiltersToParams(filters) },
  );

  return unwrapData(payload) ?? [];
}

export async function listAnnualRankingsFromClient(
  filters: AnnualRankingLeaderboardFilters,
): Promise<AnnualRankingLeaderboardRow[]> {
  const payload = await apiRequestFromClient<
    Envelope<AnnualRankingLeaderboardRow[]>
  >("/annual-rankings", { params: leaderboardFiltersToParams(filters) });

  return unwrapData(payload) ?? [];
}

export async function listRankingTiers(): Promise<RankingTier[]> {
  const payload = await apiRequest<Envelope<RankingTier[]>>("/ranking-tiers");
  return unwrapData(payload) ?? [];
}

export async function listRankingTiersFromClient(): Promise<RankingTier[]> {
  const payload = await apiRequestFromClient<Envelope<RankingTier[]>>(
    "/ranking-tiers",
  );
  return unwrapData(payload) ?? [];
}

export async function updateRankingTier(
  id: string,
  payload: Pick<
    RankingTierFormValues,
    "name" | "band_percentage" | "color" | "icon" | "sort_order" | "active"
  >,
): Promise<RankingTier> {
  const response = await apiRequestFromClient<Envelope<RankingTier>>(
    `/ranking-tiers/${id}`,
    { method: "PATCH", body: payload },
  );

  return unwrapData(response);
}
