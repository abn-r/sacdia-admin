import { apiRequest } from "@/lib/api/client";

export type Honor = {
  honor_id: number;
  name: string;
  title?: string;
  description?: string | null;
  requirements_count?: number;
  patch_image?: string | null;
  honor_image?: string | null;
  material_url?: string | null;
  master_honors?: number | null;
  year?: string | null;
  approval?: number | null;
  category_id?: number;
  honors_category_id?: number;
  club_type_id?: number;
  skill_level?: number;
  active: boolean;
};

export type HonorPayload = {
  name: string;
  description?: string;
  honor_image?: string;
  patch_image?: string;
  material_url?: string;
  honors_category_id?: number;
  category_id?: number;
  club_type_id?: number;
  skill_level?: number;
  master_honors?: number;
  year?: string;
  active?: boolean;
};

export type HonorCategory = {
  honor_category_id?: number;
  category_id?: number;
  name: string;
  description?: string | null;
  honors_count?: number;
  active?: boolean;
};

export type HonorListQuery = {
  search?: string;
  name?: string;
  q?: string;
  active?: boolean;
  categoryId?: number;
  honors_category_id?: number;
  clubTypeId?: number;
  club_type_id?: number;
  skillLevel?: number;
  skill_level?: number;
  page?: number;
  limit?: number;
};

function buildListParams(query: HonorListQuery) {
  const params: Record<string, string | number | boolean | undefined> = {};

  const search =
    (typeof query.search === "string" && query.search.trim().length > 0
      ? query.search
      : typeof query.name === "string" && query.name.trim().length > 0
        ? query.name
        : typeof query.q === "string" && query.q.trim().length > 0
          ? query.q
          : "")
      .trim();

  if (search) {
    // Compatibility aliases: different honors backends may expect different query keys.
    params.search = search;
    params.name = search;
    params.q = search;
  }

  if (typeof query.active === "boolean") {
    params.active = query.active;
  }

  if (typeof query.categoryId === "number" && Number.isFinite(query.categoryId) && query.categoryId > 0) {
    params.categoryId = Math.floor(query.categoryId);
    params.honors_category_id = Math.floor(query.categoryId);
  } else if (
    typeof query.honors_category_id === "number" &&
    Number.isFinite(query.honors_category_id) &&
    query.honors_category_id > 0
  ) {
    params.honors_category_id = Math.floor(query.honors_category_id);
  }

  if (typeof query.clubTypeId === "number" && Number.isFinite(query.clubTypeId) && query.clubTypeId > 0) {
    params.clubTypeId = Math.floor(query.clubTypeId);
    params.club_type_id = Math.floor(query.clubTypeId);
  } else if (
    typeof query.club_type_id === "number" &&
    Number.isFinite(query.club_type_id) &&
    query.club_type_id > 0
  ) {
    params.club_type_id = Math.floor(query.club_type_id);
  }

  if (typeof query.skillLevel === "number" && Number.isFinite(query.skillLevel) && query.skillLevel > 0) {
    params.skillLevel = Math.floor(query.skillLevel);
    params.skill_level = Math.floor(query.skillLevel);
  } else if (
    typeof query.skill_level === "number" &&
    Number.isFinite(query.skill_level) &&
    query.skill_level > 0
  ) {
    params.skill_level = Math.floor(query.skill_level);
  }

  if (typeof query.page === "number" && Number.isFinite(query.page) && query.page > 0) {
    params.page = Math.floor(query.page);
  }

  if (typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0) {
    params.limit = Math.min(100, Math.floor(query.limit));
  }

  return params;
}

export async function listHonors(query: HonorListQuery = {}) {
  return apiRequest<unknown>("/honors", { params: buildListParams(query) });
}

export async function getHonorById(honorId: number) {
  return apiRequest<Honor>(`/honors/${honorId}`);
}

export async function createHonor(payload: HonorPayload) {
  return apiRequest("/honors", {
    method: "POST",
    body: payload,
  });
}

export async function updateHonor(honorId: number, payload: Partial<HonorPayload>) {
  return apiRequest(`/honors/${honorId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listHonorCategories() {
  return apiRequest<HonorCategory[]>("/honors/categories");
}
