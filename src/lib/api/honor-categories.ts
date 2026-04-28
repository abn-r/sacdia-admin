import { apiRequest } from "@/lib/api/client";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

export type HonorCategory = {
  honor_category_id?: number;
  category_id?: number;
  name: string;
  description?: string | null;
  honors_count?: number;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  translations?: CatalogTranslation[];
};

export type HonorCategoryPayload = {
  name: string;
  description?: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export type HonorCategoryListQuery = {
  search?: string;
  name?: string;
  q?: string;
  active?: boolean;
  page?: number;
  limit?: number;
};

function buildListParams(query: HonorCategoryListQuery) {
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
    params.search = search;
    params.name = search;
    params.q = search;
  }

  if (typeof query.active === "boolean") {
    params.active = query.active;
  }

  if (typeof query.page === "number" && Number.isFinite(query.page) && query.page > 0) {
    params.page = Math.floor(query.page);
  }

  if (typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0) {
    params.limit = Math.min(500, Math.floor(query.limit));
  }

  return params;
}

export async function listHonorCategoriesAdmin(query: HonorCategoryListQuery = {}) {
  return apiRequest<unknown>("/admin/honor-categories", { params: buildListParams(query) });
}

export async function getHonorCategoryById(honorCategoryId: number) {
  return apiRequest<HonorCategory>(`/admin/honor-categories/${honorCategoryId}`);
}

export async function createHonorCategory(payload: HonorCategoryPayload) {
  return apiRequest("/admin/honor-categories", {
    method: "POST",
    body: payload,
  });
}

export async function updateHonorCategory(honorCategoryId: number, payload: Partial<HonorCategoryPayload>) {
  return apiRequest(`/admin/honor-categories/${honorCategoryId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteHonorCategory(honorCategoryId: number) {
  return apiRequest(`/admin/honor-categories/${honorCategoryId}`, {
    method: "DELETE",
  });
}
