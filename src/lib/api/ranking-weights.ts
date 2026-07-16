import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankingWeights {
  ranking_weight_config_id: string;
  /** null for the default global row — cannot be deleted. */
  club_type_id: number | null;
  folder_weight: number;
  finance_weight: number;
  camporee_weight: number;
  evidence_weight: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface CreateRankingWeightsPayload {
  club_type_id: number;
  folder_weight: number;
  finance_weight: number;
  camporee_weight: number;
  evidence_weight: number;
}

export interface UpdateRankingWeightsPayload {
  folder_weight?: number;
  finance_weight?: number;
  camporee_weight?: number;
  evidence_weight?: number;
}

// ─── Server-side API functions (use apiRequest — reads cookie server-side) ────

export async function fetchRankingWeights(): Promise<RankingWeights[]> {
  return apiRequest<RankingWeights[]>("/ranking-weights");
}

// ─── Client-side API functions (use apiRequestFromClient — uses withCredentials axios) ─

export async function fetchRankingWeightsFromClient(): Promise<RankingWeights[]> {
  return apiRequestFromClient<RankingWeights[]>("/ranking-weights");
}

export async function createRankingWeights(
  payload: CreateRankingWeightsPayload,
): Promise<RankingWeights> {
  return apiRequestFromClient<RankingWeights>("/ranking-weights", {
    method: "POST",
    body: payload,
  });
}

export async function updateRankingWeights(
  id: string,
  patch: UpdateRankingWeightsPayload,
): Promise<RankingWeights> {
  return apiRequestFromClient<RankingWeights>(`/ranking-weights/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteRankingWeights(id: string): Promise<void> {
  await apiRequestFromClient(`/ranking-weights/${id}`, { method: "DELETE" });
}
