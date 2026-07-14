import type { CatalogTranslation } from "@/lib/types/catalog-translation";

export type AdminHonorCategory = {
  honor_category_id: number;
  name: string;
  description: string | null;
  icon: number | null;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
  _count?: {
    honors: number;
  };
};

export type AdminHonorCategoryRow = AdminHonorCategory & {
  honors_count: number;
};

export type HonorCategoryPayload = {
  name: string;
  description?: string;
  active?: boolean;
  icon?: number | null;
  translations?: CatalogTranslation[];
};

export type HonorCategoryListQuery = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
};

export type HonorCategoryListResult = {
  items: AdminHonorCategory[];
  total: number;
  page: number;
  limit: number;
};

export function normalizeHonorCategoryRow(category: AdminHonorCategory): AdminHonorCategoryRow {
  return {
    ...category,
    honors_count: category._count?.honors ?? 0,
  };
}
