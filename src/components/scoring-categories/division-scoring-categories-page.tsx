"use client";

import { useCallback } from "react";
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
      updateDivisionScoringCategory(id, { active } as UpdateScoringCategoryPayload & {
        active?: boolean;
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías de Puntuación"
        description="Categorías configuradas a nivel División. Todas las uniones y campos locales las heredan de forma automática."
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
