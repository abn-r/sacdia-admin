"use client";

import { useCallback } from "react";
import { ScoringCategoriesTable } from "@/components/scoring-categories/scoring-categories-table";
import {
  getLocalFieldScoringCategories,
  createLocalFieldScoringCategory,
  updateLocalFieldScoringCategory,
  deleteLocalFieldScoringCategory,
} from "@/lib/api/scoring-categories";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
} from "@/lib/api/scoring-categories";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LocalFieldScoringCategoriesTabProps {
  fieldId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocalFieldScoringCategoriesTab({
  fieldId,
}: LocalFieldScoringCategoriesTabProps) {
  const fetchCategories = useCallback(
    () => getLocalFieldScoringCategories(fieldId),
    [fieldId],
  );

  const handleCreate = useCallback(
    (payload: CreateScoringCategoryPayload) =>
      createLocalFieldScoringCategory(fieldId, payload),
    [fieldId],
  );

  const handleUpdate = useCallback(
    (id: number, payload: UpdateScoringCategoryPayload) =>
      updateLocalFieldScoringCategory(fieldId, id, payload),
    [fieldId],
  );

  const handleDelete = useCallback(
    (id: number) => deleteLocalFieldScoringCategory(fieldId, id),
    [fieldId],
  );

  const handleToggleActive = useCallback(
    async (id: number, active: boolean): Promise<ScoringCategory> =>
      updateLocalFieldScoringCategory(fieldId, id, { active }),
    [fieldId],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Categorías de puntuación de este campo local. Las categorías de División
        y Unión se muestran en modo lectura. Podés agregar categorías propias de
        este campo local.
      </p>
      <ScoringCategoriesTable
        editableLevel="LOCAL_FIELD"
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
