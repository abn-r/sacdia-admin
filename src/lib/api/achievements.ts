import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AchievementTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
export type AchievementType = "THRESHOLD" | "STREAK" | "COMPOUND" | "MILESTONE" | "COLLECTION";
export type AchievementScope = "GLOBAL" | "CLUB_TYPE" | "ECCLESIASTICAL_YEAR";
export type CriteriaOperator = "gte" | "lte" | "eq";
export type StreakUnit = "day" | "week" | "month";
export type CompoundLogic = "AND" | "OR";

export type ThresholdCriteria = {
  event: string;
  operator: CriteriaOperator;
  target: number;
  filters?: Record<string, unknown>;
};

export type StreakCriteria = {
  event: string;
  target: number;
  streak_unit: StreakUnit;
  grace_period?: number;
};

export type CompoundCondition = {
  event: string;
  operator: CriteriaOperator;
  target: number;
};

export type CompoundCriteria = {
  logic: CompoundLogic;
  conditions: CompoundCondition[];
};

export type MilestoneCriteria = {
  event: string;
  field: string;
  operator: CriteriaOperator;
  target: string;
};

export type CollectionCriteria = {
  event: string;
  distinct_field: string;
  target: number;
};

export type AchievementCriteria =
  | ThresholdCriteria
  | StreakCriteria
  | CompoundCriteria
  | MilestoneCriteria
  | CollectionCriteria;

export type AchievementCategory = {
  achievement_category_id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  display_order?: number | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Achievement = {
  achievement_id: number;
  name: string;
  description?: string | null;
  type: AchievementType;
  tier: AchievementTier;
  points: number;
  scope: AchievementScope;
  secret: boolean;
  repeatable: boolean;
  max_repeats?: number | null;
  category_id?: number | null;
  category?: AchievementCategory | null;
  prerequisite_id?: number | null;
  prerequisite?: Pick<Achievement, "achievement_id" | "name"> | null;
  criteria: AchievementCriteria;
  badge_image_url?: string | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AchievementStats = {
  total: number;
  active: number;
  by_tier: Record<AchievementTier, number>;
  by_type: Record<AchievementType, number>;
  total_categories: number;
};

// tier and search reserved — not accepted by backend as of 2026-04-15
export type AchievementListQuery = {
  categoryId?: number;
  type?: AchievementType;
  active?: boolean;
  page?: number;
  limit?: number;
};

export type CategoryListQuery = {
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

export type AchievementCategoryPayload = {
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
  active?: boolean;
};

export type AchievementPayload = {
  name: string;
  description?: string;
  type: AchievementType;
  tier: AchievementTier;
  points: number;
  scope: AchievementScope;
  secret?: boolean;
  repeatable?: boolean;
  max_repeats?: number;
  category_id?: number;
  prerequisite_id?: number;
  criteria: AchievementCriteria;
  active?: boolean;
};

// ─── Category API ─────────────────────────────────────────────────────────────

export async function listAchievementCategories(query: CategoryListQuery = {}) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.search) params.search = query.search;
  if (typeof query.active === "boolean") params.active = query.active;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  return apiRequest<unknown>("/achievements/categories", { params });
}

export async function listAchievementCategoriesAdmin(query: CategoryListQuery = {}) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.search) params.search = query.search;
  if (typeof query.active === "boolean") params.active = query.active;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  return apiRequest<unknown>("/admin/achievements/categories", { params });
}

export async function createAchievementCategory(payload: AchievementCategoryPayload) {
  return apiRequest<AchievementCategory>("/admin/achievements/categories", {
    method: "POST",
    body: payload,
  });
}

export async function updateAchievementCategory(
  categoryId: number,
  payload: Partial<AchievementCategoryPayload>,
) {
  return apiRequest<AchievementCategory>(`/admin/achievements/categories/${categoryId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAchievementCategory(categoryId: number) {
  return apiRequest(`/admin/achievements/categories/${categoryId}`, {
    method: "DELETE",
  });
}

// ─── Achievement API ──────────────────────────────────────────────────────────

export async function listAchievementsAdmin(query: AchievementListQuery = {}) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.categoryId) params.categoryId = query.categoryId;
  if (query.type) params.type = query.type;
  if (typeof query.active === "boolean") params.active = query.active;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  return apiRequest<unknown>("/admin/achievements", { params });
}

export async function getAchievementById(achievementId: number) {
  return apiRequest<Achievement>(`/admin/achievements/${achievementId}`);
}

export async function createAchievement(payload: AchievementPayload) {
  return apiRequest<Achievement>("/admin/achievements", {
    method: "POST",
    body: payload,
  });
}

export async function updateAchievement(achievementId: number, payload: Partial<AchievementPayload>) {
  return apiRequest<Achievement>(`/admin/achievements/${achievementId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAchievement(achievementId: number) {
  return apiRequest(`/admin/achievements/${achievementId}`, {
    method: "DELETE",
  });
}

export async function getAchievementStats() {
  return apiRequest<AchievementStats>("/admin/achievements/stats");
}

export async function uploadAchievementImage(achievementId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequestFromClient<{ badge_image_key: string; badge_image_url: string }>(
    `/admin/achievements/${achievementId}/image`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function triggerRetroactiveEvaluation(achievementId: number) {
  return apiRequestFromClient<{ message: string; processed: number }>(
    `/admin/achievements/retroactive/${achievementId}`,
    { method: "POST" },
  );
}
