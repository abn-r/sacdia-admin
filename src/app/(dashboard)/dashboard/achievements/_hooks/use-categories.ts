"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAchievementCategoriesAdmin,
  createAchievementCategory,
  updateAchievementCategory,
  deleteAchievementCategory,
  type CategoryListQuery,
  type AchievementCategoryPayload,
} from "@/lib/api/achievements";

export const ACHIEVEMENT_CATEGORIES_QUERY_KEY = "achievement-categories" as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export function useAchievementCategories(query: CategoryListQuery = {}) {
  return useQuery({
    queryKey: [ACHIEVEMENT_CATEGORIES_QUERY_KEY, query],
    queryFn: () => listAchievementCategoriesAdmin(query),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateAchievementCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AchievementCategoryPayload) =>
      createAchievementCategory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ACHIEVEMENT_CATEGORIES_QUERY_KEY],
      });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateAchievementCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: number;
      payload: Partial<AchievementCategoryPayload>;
    }) => updateAchievementCategory(categoryId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ACHIEVEMENT_CATEGORIES_QUERY_KEY],
      });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteAchievementCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: number) => deleteAchievementCategory(categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ACHIEVEMENT_CATEGORIES_QUERY_KEY],
      });
    },
  });
}
