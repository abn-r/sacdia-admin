import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OriginLevel = "DIVISION" | "UNION" | "LOCAL_FIELD";

export type ScoringCategory = {
  scoring_category_id: number;
  name: string;
  max_points: number;
  origin_level: OriginLevel;
  origin_id: number;
  origin_badge: string;
  active: boolean;
  readonly: boolean;
};

export type CreateScoringCategoryPayload = {
  name: string;
  max_points: number;
};

export type UpdateScoringCategoryPayload = {
  name?: string;
  max_points?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(payload: unknown): ScoringCategory[] {
  if (Array.isArray(payload)) return payload as ScoringCategory[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as ScoringCategory[];
  }
  return [];
}

function extractItem(payload: unknown): ScoringCategory {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: ScoringCategory }).data;
  }
  return payload as ScoringCategory;
}

// ─── Division Level ───────────────────────────────────────────────────────────

/**
 * GET /divisions/scoring-categories
 * List all division-level scoring categories.
 * Server-side safe (uses apiRequest).
 */
export async function getDivisionScoringCategories(): Promise<ScoringCategory[]> {
  const res = await apiRequest<unknown>("/divisions/scoring-categories");
  return extractList(res);
}

/**
 * POST /divisions/scoring-categories
 * Create a new division-level scoring category.
 */
export async function createDivisionScoringCategory(
  data: CreateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>("/divisions/scoring-categories", {
    method: "POST",
    body: data,
  });
  return extractItem(res);
}

/**
 * PATCH /divisions/scoring-categories/:id
 * Update a division-level scoring category.
 */
export async function updateDivisionScoringCategory(
  id: number,
  data: UpdateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>(
    `/divisions/scoring-categories/${id}`,
    { method: "PATCH", body: data },
  );
  return extractItem(res);
}

/**
 * DELETE /divisions/scoring-categories/:id
 * Soft-delete (set active = false) a division-level scoring category.
 */
export async function deleteDivisionScoringCategory(id: number): Promise<void> {
  await apiRequestFromClient(`/divisions/scoring-categories/${id}`, {
    method: "DELETE",
  });
}

// ─── Union Level ──────────────────────────────────────────────────────────────

/**
 * GET /unions/:unionId/scoring-categories
 * List all categories for a union (includes inherited division categories).
 * Server-side safe (uses apiRequest).
 */
export async function getUnionScoringCategories(
  unionId: number,
): Promise<ScoringCategory[]> {
  const res = await apiRequest<unknown>(`/unions/${unionId}/scoring-categories`);
  return extractList(res);
}

/**
 * POST /unions/:unionId/scoring-categories
 * Create a new union-level scoring category.
 */
export async function createUnionScoringCategory(
  unionId: number,
  data: CreateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>(
    `/unions/${unionId}/scoring-categories`,
    { method: "POST", body: data },
  );
  return extractItem(res);
}

/**
 * PATCH /unions/:unionId/scoring-categories/:id
 * Update a union-owned scoring category (own categories only).
 */
export async function updateUnionScoringCategory(
  unionId: number,
  id: number,
  data: UpdateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>(
    `/unions/${unionId}/scoring-categories/${id}`,
    { method: "PATCH", body: data },
  );
  return extractItem(res);
}

/**
 * DELETE /unions/:unionId/scoring-categories/:id
 * Soft-delete a union-owned scoring category (own categories only).
 */
export async function deleteUnionScoringCategory(
  unionId: number,
  id: number,
): Promise<void> {
  await apiRequestFromClient(`/unions/${unionId}/scoring-categories/${id}`, {
    method: "DELETE",
  });
}

// ─── Local Field Level ────────────────────────────────────────────────────────

/**
 * GET /local-fields/:fieldId/scoring-categories
 * List all categories for a local field (division + union + own).
 * Server-side safe (uses apiRequest).
 */
export async function getLocalFieldScoringCategories(
  fieldId: number,
): Promise<ScoringCategory[]> {
  const res = await apiRequest<unknown>(
    `/local-fields/${fieldId}/scoring-categories`,
  );
  return extractList(res);
}

/**
 * POST /local-fields/:fieldId/scoring-categories
 * Create a new local field-level scoring category.
 */
export async function createLocalFieldScoringCategory(
  fieldId: number,
  data: CreateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>(
    `/local-fields/${fieldId}/scoring-categories`,
    { method: "POST", body: data },
  );
  return extractItem(res);
}

/**
 * PATCH /local-fields/:fieldId/scoring-categories/:id
 * Update a local field-owned scoring category.
 */
export async function updateLocalFieldScoringCategory(
  fieldId: number,
  id: number,
  data: UpdateScoringCategoryPayload,
): Promise<ScoringCategory> {
  const res = await apiRequestFromClient<unknown>(
    `/local-fields/${fieldId}/scoring-categories/${id}`,
    { method: "PATCH", body: data },
  );
  return extractItem(res);
}

/**
 * DELETE /local-fields/:fieldId/scoring-categories/:id
 * Soft-delete a local field-owned scoring category.
 */
export async function deleteLocalFieldScoringCategory(
  fieldId: number,
  id: number,
): Promise<void> {
  await apiRequestFromClient(
    `/local-fields/${fieldId}/scoring-categories/${id}`,
    { method: "DELETE" },
  );
}
