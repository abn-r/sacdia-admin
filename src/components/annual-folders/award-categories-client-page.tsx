"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AwardCategoriesClientPageProps {
  initialCategories: AwardCategory[];
  clubTypes: ClubType[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterTab = "active" | "legacy";

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

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AwardCategoriesClientPage({
  initialCategories,
  clubTypes,
}: AwardCategoriesClientPageProps) {
  const t = useTranslations("annual_folders");
  const [categories, setCategories] =
    useState<AwardCategory[]>(initialCategories);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("active");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AwardCategory | null>(null);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] =
    useState<AwardCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Refresh ──────────────────────────────────────────────────────────────

  const refreshCategories = useCallback(
    async (tab: FilterTab = filter) => {
      setIsRefreshing(true);
      try {
        const includeLegacy = tab === "legacy" ? true : undefined;
        const payload = await getAwardCategoriesFromClient(
          undefined,
          undefined,
          includeLegacy,
        );
        setCategories(extractCategories(payload));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron actualizar las categorias";
        toast.error(message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [filter],
  );

  // ─── Tab change ───────────────────────────────────────────────────────────

  function handleFilterChange(value: string) {
    const tab = value as FilterTab;
    setFilter(tab);
    void refreshCategories(tab);
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
          : "No se pudo eliminar la categoria";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Derived list ─────────────────────────────────────────────────────────

  const filteredCategories = [...categories]
    .filter((cat) =>
      filter === "legacy" ? cat.is_legacy === true : cat.is_legacy !== true,
    )
    .sort((a, b) => a.order - b.order);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredCategories.length}
            </span>{" "}
            {filteredCategories.length === 1 ? "categoria" : "categorias"}
          </p>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => refreshCategories()}
            disabled={isRefreshing}
            title="Actualizar"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="size-4" />
          Nueva categoria
        </Button>
      </div>

      {/* Tabs filter */}
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="legacy">Legacy</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">
            {filter === "legacy"
              ? "Sin categorias legacy"
              : "Sin categorias de premio"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filter === "legacy"
              ? "No hay categorias marcadas como legacy en este momento."
              : "Crea categorias para clasificar los clubes segun sus puntos obtenidos en la carpeta anual."}
          </p>
          {filter === "active" && (
            <Button size="sm" className="mt-4" onClick={handleCreate}>
              <Plus className="size-4" />
              Nueva categoria
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
                <TableHead className="hidden w-24 text-center lg:table-cell">
                  % Min
                </TableHead>
                <TableHead className="hidden w-24 text-center lg:table-cell">
                  % Max
                </TableHead>
                <TableHead className="w-20 text-center">Estado</TableHead>
                <TableHead className="w-20 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => (
                <TableRow
                  key={cat.award_category_id}
                  className={cat.is_legacy ? "opacity-60" : ""}
                >
                  <TableCell className="text-center">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {cat.order}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        {cat.is_legacy && (
                          <Badge variant="outline" className="text-xs">
                            Legacy
                          </Badge>
                        )}
                      </div>
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
                    {cat.max_points !== null ? cat.max_points : (
                      <span className="italic text-muted-foreground/60">
                        Sin limite
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-muted-foreground lg:table-cell">
                    {formatPct(cat.min_composite_pct)}
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-muted-foreground lg:table-cell">
                    {formatPct(cat.max_composite_pct)}
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
                        title="Editar categoria"
                        disabled={cat.is_legacy}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(cat)}
                        title="Eliminar categoria"
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

      {/* Form dialog */}
      <AwardCategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        clubTypes={clubTypes}
        onSuccess={refreshCategories}
      />

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la categoria{" "}
              <strong>{deletingCategory?.name}</strong>. Los rankings existentes
              que la referencien podrian verse afectados.
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
              {isDeleting ? "Eliminando..." : "Eliminar categoria"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
