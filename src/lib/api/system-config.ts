import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SystemConfigValueType = "string" | "number" | "boolean" | "json";

export type SystemConfig = {
  config_key: string;
  config_value: string;
  description?: string | null;
  value_type?: SystemConfigValueType | string | null;
  updated_at?: string | null;
};

// ─── Request payloads ─────────────────────────────────────────────────────────

export type UpdateSystemConfigPayload = {
  config_value: string;
};

export const SCORING_CATEGORY_MAX_POINTS_CAP_KEY =
  "scoring.category_max_points_cap";
export const DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(payload: unknown): SystemConfig[] {
  if (Array.isArray(payload)) return payload as SystemConfig[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as SystemConfig[];
  }
  return [];
}

function parsePositiveInteger(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/system-config
 * List all system configuration entries.
 */
export async function getSystemConfigs(): Promise<SystemConfig[]> {
  const res = await apiRequest<unknown>("/system-config");
  return extractList(res);
}

/**
 * Resolve current scoring max points cap from system config.
 * Falls back to DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP when config
 * is missing, invalid or the request fails.
 */
export async function getScoringCategoryMaxPointsCap(): Promise<number> {
  try {
    const configs = await getSystemConfigs();
    const capRaw = configs.find(
      (item) => item.config_key === SCORING_CATEGORY_MAX_POINTS_CAP_KEY,
    )?.config_value;
    const parsed = parsePositiveInteger(capRaw);
    return parsed ?? DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP;
  } catch {
    return DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP;
  }
}

/**
 * PATCH /api/v1/system-config/:key
 * Update the value of a system config entry.
 * Client-side only (mutation).
 */
export async function updateSystemConfig(
  key: string,
  payload: UpdateSystemConfigPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(`/system-config/${key}`, {
    method: "PATCH",
    body: payload,
  });
}
