"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Pencil, Trash2, Tags, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoringCategoryDialog } from "@/components/scoring-categories/scoring-category-dialog";
import { ScoringCategoryDeleteDialog } from "@/components/scoring-categories/scoring-category-delete-dialog";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
  OriginLevel,
} from "@/lib/api/scoring-categories";

// ─── Origin badge config ──────────────────────────────────────────────────────

const ORIGIN_BADGE_LABELS: Record<OriginLevel, string> = {
  DIVISION: "División",
  UNION: "Unión",
  LOCAL_FIELD: "Campo Local",
};

const ORIGIN_BADGE_VARIANTS: Record<
  OriginLevel,
  "default" | "secondary" | "outline"
> = {
  DIVISION: "secondary",
  UNION: "secondary",
  LOCAL_FIELD: "default",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {["Nombre", "Pts. Máx.", "Origen", "Estado", "Acciones"].map(
              (h) => (
                <TableHead
                  key={h}
                  className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-7 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoringCategoriesTableProps {
  /** Origin level that this table manages (for the "Nueva Categoría" button scope). */
  editableLevel: OriginLevel;
  /** Async function that fetches the list of categories. */
  fetchCategories: () => Promise<ScoringCategory[]>;
  /** Create function for the editable level. */
  onCreate: (payload: CreateScoringCategoryPayload) => Promise<ScoringCategory>;
  /** Update function for the editable level. */
  onUpdate: (
    id: number,
    payload: UpdateScoringCategoryPayload,
  ) => Promise<ScoringCategory>;
  /** Delete function for the editable level. */
  onDelete: (id: number) => Promise<void>;
  /** Optional: toggle active status for quick switch. */
  onToggleActive?: (
    id: number,
    active: boolean,
  ) => Promise<ScoringCategory>;
  /** Whether to show the origin badge column (union and local field views need it). */
  showOriginBadge?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringCategoriesTable({
  editableLevel,
  fetchCategories,
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
  showOriginBadge = false,
}: ScoringCategoriesTableProps) {
  const [categories, setCategories] = useState<ScoringCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ScoringCategory | null>(
    null,
  );
  const [deleteCategory, setDeleteCategory] =
    useState<ScoringCategory | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las categorías";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ─── Save handler (create or update) ───────────────────────────────────────

  async function handleSave(
    payload: CreateScoringCategoryPayload | UpdateScoringCategoryPayload,
    id?: number,
  ): Promise<ScoringCategory> {
    if (id !== undefined) {
      const updated = await onUpdate(id, payload);
      setCategories((prev) =>
        prev.map((c) =>
          c.scoring_category_id === id ? { ...c, ...updated } : c,
        ),
      );
      return updated;
    } else {
      const created = await onCreate(payload as CreateScoringCategoryPayload);
      setCategories((prev) => [...prev, created]);
      return created;
    }
  }

  // ─── Delete handler ─────────────────────────────────────────────────────────

  async function handleDelete(id: number): Promise<void> {
    await onDelete(id);
  }

  function handleDeleteSuccess(id: number) {
    setCategories((prev) =>
      prev.filter((c) => c.scoring_category_id !== id),
    );
  }

  // ─── Toggle active ──────────────────────────────────────────────────────────

  async function handleToggle(category: ScoringCategory) {
    if (!onToggleActive) return;
    setTogglingIds((prev) => new Set(prev).add(category.scoring_category_id));
    try {
      const updated = await onToggleActive(
        category.scoring_category_id,
        !category.active,
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.scoring_category_id === category.scoring_category_id
            ? { ...c, active: updated.active }
            : c,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cambiar el estado";
      toast.error(message);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(category.scoring_category_id);
        return next;
      });
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <TableSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}{" "}
        <button
          type="button"
          className="ml-2 underline underline-offset-2"
          onClick={loadCategories}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const editableCategories = categories.filter(
    (c) => c.origin_level === editableLevel,
  );
  const inheritedCategories = categories.filter(
    (c) => c.origin_level !== editableLevel,
  );
  const sortedCategories = [...inheritedCategories, ...editableCategories];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {inheritedCategories.length > 0 &&
            `${inheritedCategories.length} heredada${inheritedCategories.length !== 1 ? "s" : ""}, `}
          {editableCategories.length} propia{editableCategories.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Nueva categoría
        </Button>
      </div>

      {/* Table or empty */}
      {sortedCategories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Sin categorías"
          description="No hay categorías de puntuación configuradas. Crea la primera para empezar."
        >
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Nueva categoría
          </Button>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nombre
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pts. Máx.
                </TableHead>
                {showOriginBadge && (
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Origen
                  </TableHead>
                )}
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="h-9 px-3 w-[100px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((cat) => {
                const isEditable = cat.origin_level === editableLevel;
                const isToggling = togglingIds.has(cat.scoring_category_id);

                return (
                  <TableRow
                    key={cat.scoring_category_id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="px-3 py-2.5 align-middle text-sm font-medium">
                      {cat.name}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-right text-sm tabular-nums">
                      {cat.max_points}
                    </TableCell>
                    {showOriginBadge && (
                      <TableCell className="px-3 py-2.5 align-middle">
                        <Badge
                          variant={
                            ORIGIN_BADGE_VARIANTS[cat.origin_level]
                          }
                          className="text-xs"
                        >
                          {cat.origin_badge ||
                            ORIGIN_BADGE_LABELS[cat.origin_level]}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="px-3 py-2.5 align-middle">
                      {onToggleActive && isEditable ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cat.active}
                            onCheckedChange={() => handleToggle(cat)}
                            disabled={isToggling}
                            aria-label={
                              cat.active
                                ? "Desactivar categoría"
                                : "Activar categoría"
                            }
                          />
                          {isToggling && (
                            <Loader2 className="size-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant={cat.active ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {cat.active ? "Activa" : "Inactiva"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      {isEditable ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 hover:bg-muted"
                            onClick={() => setEditCategory(cat)}
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive hover:bg-muted"
                            onClick={() => {
                              setDeleteCategory(cat);
                              setDeleteOpen(true);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Solo lectura
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit dialog */}
      <ScoringCategoryDialog
        open={createOpen || Boolean(editCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditCategory(null);
          }
        }}
        category={editCategory}
        onSave={handleSave}
        onSuccess={() => {
          setEditCategory(null);
          setCreateOpen(false);
        }}
      />

      {/* Delete dialog */}
      <ScoringCategoryDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        category={deleteCategory}
        onDelete={handleDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
