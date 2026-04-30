"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AwardCategoryFormDialog } from "@/components/annual-folders/award-category-form-dialog";
import {
  getAwardCategoriesFromClient,
  deleteAwardCategory,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type { AwardCategory, AwardCategoryScope } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AwardCategoriesClientPageProps {
  initialCategories: AwardCategory[];
  clubTypes: ClubType[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCategories(payload: unknown): AwardCategory[] {
  if (Array.isArray(payload)) return payload as AwardCategory[];
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as AwardCategory[];
  }
  return [];
}

function clubTypeLabel(
  clubTypeId: number | null,
  clubTypes: ClubType[],
): string {
  if (clubTypeId === null) return "Todos los tipos";
  const found = clubTypes.find((ct) => ct.club_type_id === clubTypeId);
  return found?.name ?? `Tipo ${clubTypeId}`;
}

const SCOPE_LABELS: Record<AwardCategoryScope, string> = {
  club: "Club",
  section: "Sección",
  member: "Miembro",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AwardCategoriesClientPage({
  initialCategories,
  clubTypes,
}: AwardCategoriesClientPageProps) {
  const t = useTranslations("annual_folders");

  // Outer tab: scope
  const [scope, setScope] = useState<AwardCategoryScope>("club");
  // Inner tab: active filter
  const [activeFilter, setActiveFilter] = useState<"active" | "legacy">("active");

  const [categories, setCategories] = useState<AwardCategory[]>(
    initialCategories.filter((c) => c.scope === "club" && c.active),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AwardCategory | null>(null);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<AwardCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── First-render guard — skip the effect on mount (SSR data already correct) ──

  const isFirstRender = useRef(true);

  // ─── Fetch on scope / activeFilter change ─────────────────────────────────

  const fetchCategories = useCallback(
    async (targetScope: AwardCategoryScope, targetFilter: "active" | "legacy") => {
      setIsRefreshing(true);
      try {
        const isActive = targetFilter === "active";
        const payload = await getAwardCategoriesFromClient(
          undefined,
          isActive,
          targetScope,
        );
        setCategories(extractCategories(payload));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las categorías";
        toast.error(message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // SSR initialCategories already correct for default (scope, activeFilter) pair
    }
    void fetchCategories(scope, activeFilter);
  }, [scope, activeFilter, fetchCategories]);

  const refreshCategories = useCallback(async () => {
    await fetchCategories(scope, activeFilter);
  }, [scope, activeFilter, fetchCategories]);

  // ─── Scope tab change ─────────────────────────────────────────────────────

  function handleScopeChange(value: string) {
    setScope(value as AwardCategoryScope);
  }

  // ─── Active filter tab change ─────────────────────────────────────────────

  function handleActiveFilterChange(value: string) {
    setActiveFilter(value as "active" | "legacy");
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  function handleCreate() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────

  function handleEdit(category: AwardCategory) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  function handleDelete(category: AwardCategory) {
    setDeletingCategory(category);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await deleteAwardCategory(deletingCategory.award_category_id);
      toast.success(t("toasts.category_deleted"));
      setDeleteOpen(false);
      setDeletingCategory(null);
      await refreshCategories();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la categoría";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Sorted by order ──────────────────────────────────────────────────────

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const scopeLabel = SCOPE_LABELS[scope];
  const filterLabel = activeFilter === "active" ? "activas" : "legacy";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Scope tabs (outer) */}
      <Tabs value={scope} onValueChange={handleScopeChange}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="club">Club</TabsTrigger>
            <TabsTrigger value="section">Sección</TabsTrigger>
            <TabsTrigger value="member">Miembro</TabsTrigger>
          </TabsList>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {categories.length}
              </span>{" "}
              {categories.length === 1 ? "categoría" : "categorías"}
            </p>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={refreshCategories}
              disabled={isRefreshing}
              title="Actualizar"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Actualizar</span>
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-4" />
              Nueva categoría
            </Button>
          </div>
        </div>

        <TabsContent value={scope} className="mt-4 space-y-4">
          {/* Active / Legacy inner tabs */}
          <Tabs value={activeFilter} onValueChange={handleActiveFilterChange}>
            <TabsList variant="line">
              <TabsTrigger value="active">Activas</TabsTrigger>
              <TabsTrigger value="legacy">Legacy</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4">
              {/* List */}
              {sortedCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Plus className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Sin categorías de {scopeLabel.toLowerCase()} {filterLabel}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    No hay categorías de {scopeLabel.toLowerCase()}{" "}
                    {activeFilter === "active"
                      ? "activas"
                      : "inactivas (legacy)"}
                    . Crea una nueva para clasificar según puntos obtenidos.
                  </p>
                  {activeFilter === "active" && (
                    <Button size="sm" className="mt-4" onClick={handleCreate}>
                      <Plus className="size-4" />
                      Nueva categoría
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Orden</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Tipo club
                        </TableHead>
                        <TableHead className="w-24 text-center">Pts Min</TableHead>
                        <TableHead className="hidden w-24 text-center md:table-cell">
                          Pts Max
                        </TableHead>
                        <TableHead className="w-20 text-center">Estado</TableHead>
                        <TableHead className="w-20 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCategories.map((cat) => (
                        <TableRow key={cat.award_category_id}>
                          <TableCell className="text-center">
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {cat.order}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{cat.name}</span>
                              {cat.description && (
                                <span className="line-clamp-1 text-xs text-muted-foreground">
                                  {cat.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {clubTypeLabel(cat.club_type_id, clubTypes)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {cat.min_points}
                          </TableCell>
                          <TableCell className="hidden text-center text-sm text-muted-foreground md:table-cell">
                            {cat.max_points !== null ? (
                              cat.max_points
                            ) : (
                              <span className="italic text-muted-foreground/60">
                                Sin límite
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={cat.active ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {cat.active ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleEdit(cat)}
                                title="Editar categoría"
                              >
                                <Pencil className="size-3.5" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDelete(cat)}
                                title="Eliminar categoría"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <AwardCategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        clubTypes={clubTypes}
        defaultScope={scope}
        onSuccess={refreshCategories}
      />

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la categoría{" "}
              <strong>{deletingCategory?.name}</strong>. Los rankings existentes
              que la referencien podrían verse afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar categoría"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
