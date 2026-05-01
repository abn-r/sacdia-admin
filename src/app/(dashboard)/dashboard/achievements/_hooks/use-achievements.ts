"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAchievementsAdmin,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementStats,
  uploadAchievementImage,
  triggerRetroactiveEvaluation,
  type AchievementListQuery,
  type AchievementPayload,
} from "@/lib/api/achievements";
import { ACHIEVEMENT_CATEGORIES_QUERY_KEY } from "@/app/(dashboard)/dashboard/achievements/_hooks/use-categories";

export const ACHIEVEMENTS_QUERY_KEY = "achievements" as const;
export const ACHIEVEMENT_STATS_QUERY_KEY = "achievement-stats" as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export function useAchievements(query: AchievementListQuery = {}) {
  return useQuery({
    queryKey: [ACHIEVEMENTS_QUERY_KEY, query],
    queryFn: () => listAchievementsAdmin(query),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useAchievement(achievementId: number | null | undefined) {
  return useQuery({
    queryKey: [ACHIEVEMENTS_QUERY_KEY, achievementId],
    queryFn: () => getAchievementById(achievementId!),
    enabled: achievementId != null && achievementId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useAchievementStats() {
  return useQuery({
    queryKey: [ACHIEVEMENT_STATS_QUERY_KEY],
    queryFn: getAchievementStats,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AchievementPayload) => createAchievement(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENTS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENT_STATS_QUERY_KEY] });
      if (variables.category_id) {
        void queryClient.invalidateQueries({
          queryKey: [ACHIEVEMENT_CATEGORIES_QUERY_KEY],
        });
      }
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      achievementId,
      payload,
    }: {
      achievementId: number;
      payload: Partial<AchievementPayload>;
    }) => updateAchievement(achievementId, payload),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENTS_QUERY_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [ACHIEVEMENTS_QUERY_KEY, variables.achievementId],
      });
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENT_STATS_QUERY_KEY] });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: number) => deleteAchievement(achievementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENTS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENT_STATS_QUERY_KEY] });
    },
  });
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export function useUploadAchievementImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ achievementId, file }: { achievementId: number; file: File }) =>
      uploadAchievementImage(achievementId, file),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [ACHIEVEMENTS_QUERY_KEY, variables.achievementId],
      });
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENTS_QUERY_KEY] });
    },
  });
}

// ─── Retroactive evaluation ───────────────────────────────────────────────────

export function useTriggerRetroactiveEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: number) => triggerRetroactiveEvaluation(achievementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ACHIEVEMENTS_QUERY_KEY] });
    },
  });
}
