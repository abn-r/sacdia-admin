import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SystemConfigValueType = "string" | "number" | "boolean" | "json";

export type SystemConfig = {
  key: string;
  config_value: string;
  description?: string | null;
  value_type?: SystemConfigValueType | string | null;
  updated_at?: string | null;
};

// ─── Request payloads ─────────────────────────────────────────────────────────

export type UpdateSystemConfigPayload = {
  config_value: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(payload: unknown): SystemConfig[] {
  if (Array.isArray(payload)) return payload as SystemConfig[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as SystemConfig[];
  }
  return [];
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
