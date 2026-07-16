"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { ScoringCategoriesTable } from "@/components/scoring-categories/scoring-categories-table";
import {
  getDivisionScoringCategories,
  createDivisionScoringCategory,
  updateDivisionScoringCategory,
  deleteDivisionScoringCategory,
} from "@/lib/api/scoring-categories";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
} from "@/lib/api/scoring-categories";

// ─── Component ────────────────────────────────────────────────────────────────

export function DivisionScoringCategoriesPage() {
  const t = useTranslations("scoring_categories.divisionPage");
  const fetchCategories = useCallback(
    () => getDivisionScoringCategories(),
    [],
  );

  const handleCreate = useCallback(
    (payload: CreateScoringCategoryPayload) =>
      createDivisionScoringCategory(payload),
    [],
  );

  const handleUpdate = useCallback(
    (id: number, payload: UpdateScoringCategoryPayload) =>
      updateDivisionScoringCategory(id, payload),
    [],
  );

  const handleDelete = useCallback(
    (id: number) => deleteDivisionScoringCategory(id),
    [],
  );

  // Toggle active via update endpoint
  const handleToggleActive = useCallback(
    async (id: number, active: boolean): Promise<ScoringCategory> =>
      updateDivisionScoringCategory(id, { active }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <ScoringCategoriesTable
        editableLevel="DIVISION"
        fetchCategories={fetchCategories}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        showOriginBadge={false}
      />
    </div>
  );
}
