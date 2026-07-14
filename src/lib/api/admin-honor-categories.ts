import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  AdminHonorCategory,
  HonorCategoryListQuery,
  HonorCategoryListResult,
  HonorCategoryPayload,
} from "@/lib/catalogs/honor-categories/types";

function buildListParams(query: HonorCategoryListQuery) {
  const params: Record<string, string | number | boolean> = {};

  if (query.search?.trim()) {
    params.search = query.search.trim();
  }

  if (typeof query.active === "boolean") {
    params.active = query.active;
  }

  if (typeof query.page === "number" && query.page > 0) {
    params.page = Math.floor(query.page);
  }

  if (typeof query.limit === "number" && query.limit > 0) {
    params.limit = Math.min(100, Math.floor(query.limit));
  }

  return params;
}

export async function listAdminHonorCategories(query: HonorCategoryListQuery = {}) {
  const payload = await apiRequest<unknown>("/admin/honor-categories", {
    params: buildListParams(query),
  });
  return unwrapApiData<HonorCategoryListResult>(payload);
}

export async function getAdminHonorCategory(honorCategoryId: number) {
  const payload = await apiRequest<unknown>(`/admin/honor-categories/${honorCategoryId}`);
  return unwrapApiData<AdminHonorCategory>(payload);
}

export async function createAdminHonorCategory(body: HonorCategoryPayload) {
  const payload = await apiRequest<unknown>("/admin/honor-categories", {
    method: "POST",
    body,
  });
  return unwrapApiData<AdminHonorCategory>(payload);
}

export async function updateAdminHonorCategory(
  honorCategoryId: number,
  body: Partial<HonorCategoryPayload>,
) {
  const payload = await apiRequest<unknown>(`/admin/honor-categories/${honorCategoryId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminHonorCategory>(payload);
}

export async function deleteAdminHonorCategory(honorCategoryId: number) {
  const payload = await apiRequest<unknown>(`/admin/honor-categories/${honorCategoryId}`, {
    method: "DELETE",
  });
  return unwrapApiData<AdminHonorCategory>(payload);
}
