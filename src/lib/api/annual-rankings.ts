import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import type {
  AnnualRankingConfigFormValues,
  RankingTierFormValues,
} from "@/lib/annual-rankings/annual-ranking-config-validation";

export type AnnualRankingComponentConfig = {
  annual_ranking_component_config_id?: string;
  annual_ranking_config_id?: string;
  component_key: string;
  label: string;
  max_points: number;
  sort_order: number;
  active?: boolean;
};

export type AnnualRankingConfig = {
  annual_ranking_config_id: string;
  local_field_id: number;
  ecclesiastical_year_id: number;
  club_type_id: number;
  max_points: number;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
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

type Envelope<T> = { status?: string; data?: T; total?: number };

function unwrapData<T>(payload: T | Envelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as Envelope<T>).data as T;
  }
  return payload as T;
}

export type AnnualRankingConfigFilters = {
  localFieldId?: number;
  ecclesiasticalYearId?: number;
  clubTypeId?: number;
};

function filtersToParams(filters: AnnualRankingConfigFilters = {}) {
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
    { method: "POST", body: payload },
  );

  return unwrapData(response);
}

export async function updateAnnualRankingConfig(
  id: string,
  payload: Pick<AnnualRankingConfigFormValues, "max_points" | "components">,
): Promise<AnnualRankingConfig> {
  const response = await apiRequestFromClient<Envelope<AnnualRankingConfig>>(
    `/annual-ranking-configs/${id}`,
    { method: "PATCH", body: payload },
  );

  return unwrapData(response);
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
