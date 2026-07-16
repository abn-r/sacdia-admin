"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { ScoringCategoriesTable } from "@/components/scoring-categories/scoring-categories-table";
import {
  getUnionScoringCategories,
  createUnionScoringCategory,
  updateUnionScoringCategory,
  deleteUnionScoringCategory,
} from "@/lib/api/scoring-categories";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
} from "@/lib/api/scoring-categories";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnionScoringCategoriesTabProps {
  unionId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnionScoringCategoriesTab({
  unionId,
}: UnionScoringCategoriesTabProps) {
  const t = useTranslations("scoring_categories.unionTab");
  const fetchCategories = useCallback(
    () => getUnionScoringCategories(unionId),
    [unionId],
  );

  const handleCreate = useCallback(
    (payload: CreateScoringCategoryPayload) =>
      createUnionScoringCategory(unionId, payload),
    [unionId],
  );

  const handleUpdate = useCallback(
    (id: number, payload: UpdateScoringCategoryPayload) =>
      updateUnionScoringCategory(unionId, id, payload),
    [unionId],
  );

  const handleDelete = useCallback(
    (id: number) => deleteUnionScoringCategory(unionId, id),
    [unionId],
  );

  const handleToggleActive = useCallback(
    async (id: number, active: boolean): Promise<ScoringCategory> =>
      updateUnionScoringCategory(unionId, id, { active }),
    [unionId],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("description")}
      </p>
      <ScoringCategoriesTable
        editableLevel="UNION"
        fetchCategories={fetchCategories}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        showOriginBadge={true}
      />
    </div>
  );
}
