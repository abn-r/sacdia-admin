"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import { AwardCategoryFormDialog } from "@/components/annual-folders/award-category-form-dialog";
import {
  getAwardCategoriesFromClient,
  deleteAwardCategory,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type { AwardCategory, AwardCategoryScope, AwardTier } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortField = "order" | "name" | "min_points" | "max_points" | "active";

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

// ── 8.4-A: scope labels ────────────────────────────────────────────────────
const SCOPE_LABELS: Record<AwardCategoryScope, string> = {
  club: "Club",
  section: "Sección",
  member: "Miembro",
};

// ── 8.4-C: composite % formatting ─────────────────────────────────────────
function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

// ── 8.4-C Phase C: tier display ────────────────────────────────────────────
const TIER_LABELS: Record<AwardTier, string> = {
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  DIAMOND: "Diamante",
};

type BadgeVariant = "default" | "secondary" | "success" | "destructive" | "warning" | "outline";

const TIER_BADGE_VARIANT: Record<AwardTier, BadgeVariant> = {
  BRONZE: "secondary",
  SILVER: "outline",
  GOLD: "warning",
  DIAMOND: "default",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AwardCategoriesClientPage({
  initialCategories,
  clubTypes,
}: AwardCategoriesClientPageProps) {
  const t = useTranslations("annual_folders");

  // Outer tab: scope (8.4-A)
  const [scope, setScope] = useState<AwardCategoryScope>("club");
  // Inner tab: active/legacy filter
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

  // Sort state
  const [sortField, setSortField] = useState<SortField>("order");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

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
    setActiveFilter("active");
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

  // ─── Derived list ─────────────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "order":
          return (a.order - b.order) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "min_points":
          return (a.min_points - b.min_points) * dir;
        case "max_points": {
          const aMax = a.max_points ?? Number.MAX_SAFE_INTEGER;
          const bMax = b.max_points ?? Number.MAX_SAFE_INTEGER;
          return (aMax - bMax) * dir;
        }
        case "active": {
          const aAct = a.active ? 1 : 0;
          const bAct = b.active ? 1 : 0;
          return (aAct - bAct) * dir;
        }
        default:
          return 0;
      }
    });
  }, [categories, sortField, sortDirection]);

  const scopeLabel = SCOPE_LABELS[scope];
  const filterLabel = activeFilter === "active" ? "activas" : "legacy";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Scope tabs (outer — 8.4-A) */}
      <Tabs value={scope} onValueChange={handleScopeChange}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label="Alcance de la categoría">
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
            <TabsList variant="line" aria-label="Estado de la categoría">
              <TabsTrigger value="active">Activas</TabsTrigger>
              <TabsTrigger value="legacy">Legacy</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4">
              {/* List */}
              {filteredCategories.length === 0 ? (
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
                <>
                  {/* Desktop: categories table */}
                  <div className="hidden rounded-lg border border-border/60 md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="h-9 w-16 px-3 text-center"
                            aria-sort={sortField === "order" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="order" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                              Orden
                            </SortableHeader>
                          </TableHead>
                          <TableHead
                            className="h-9 px-3"
                            aria-sort={sortField === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="name" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                              Nombre
                            </SortableHeader>
                          </TableHead>
                          <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo club</TableHead>
                          <TableHead
                            className="h-9 w-24 px-3 text-center"
                            aria-sort={sortField === "min_points" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="min_points" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                              Pts Min
                            </SortableHeader>
                          </TableHead>
                          <TableHead
                            className="h-9 w-24 px-3 text-center"
                            aria-sort={sortField === "max_points" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="max_points" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                              Pts Max
                            </SortableHeader>
                          </TableHead>
                          {/* 8.4-C composite % columns */}
                          <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            % Min
                          </TableHead>
                          <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            % Max
                          </TableHead>
                          {/* 8.4-C Phase C tier column */}
                          <TableHead className="hidden h-9 w-28 px-3 text-center xl:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Nivel
                          </TableHead>
                          <TableHead
                            className="h-9 w-20 px-3 text-center"
                            aria-sort={sortField === "active" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="active" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                              Estado
                            </SortableHeader>
                          </TableHead>
                          <TableHead className="h-9 w-20 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Acciones</TableHead>
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
                            <TableCell className="text-sm text-muted-foreground">
                              {clubTypeLabel(cat.club_type_id, clubTypes)}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {cat.min_points}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {cat.max_points !== null ? (
                                cat.max_points
                              ) : (
                                <span className="italic text-muted-foreground/60">
                                  Sin límite
                                </span>
                              )}
                            </TableCell>
                            {/* 8.4-C composite % cells */}
                            <TableCell className="hidden text-center text-sm text-muted-foreground lg:table-cell">
                              {formatPct(cat.min_composite_pct)}
                            </TableCell>
                            <TableCell className="hidden text-center text-sm text-muted-foreground lg:table-cell">
                              {formatPct(cat.max_composite_pct)}
                            </TableCell>
                            {/* 8.4-C Phase C tier cell */}
                            <TableCell className="hidden text-center xl:table-cell">
                              {cat.tier !== null ? (
                                <Badge
                                  variant={TIER_BADGE_VARIANT[cat.tier]}
                                  className="text-xs"
                                >
                                  {TIER_LABELS[cat.tier]}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground/60">—</span>
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
                                  disabled={cat.is_legacy}
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

                  {/* Mobile: category cards */}
                  <ul className="space-y-3 md:hidden" aria-label={`Categorías de ${scopeLabel}`}>
                    {filteredCategories.map((cat) => (
                      <li key={cat.award_category_id}>
                        <div
                          className={`rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none${cat.is_legacy ? " opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {cat.order}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-medium">{cat.name}</span>
                                  {cat.is_legacy && (
                                    <Badge variant="outline" className="text-xs">
                                      Legacy
                                    </Badge>
                                  )}
                                </div>
                                {cat.description && (
                                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleEdit(cat)}
                                title="Editar categoría"
                                disabled={cat.is_legacy}
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
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={cat.active ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {cat.active ? "Activa" : "Inactiva"}
                            </Badge>
                            {cat.tier !== null && (
                              <Badge
                                variant={TIER_BADGE_VARIANT[cat.tier]}
                                className="text-xs"
                              >
                                {TIER_LABELS[cat.tier]}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {clubTypeLabel(cat.club_type_id, clubTypes)}
                            </span>
                          </div>

                          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                            <div>
                              <dt className="text-muted-foreground">Pts mín</dt>
                              <dd>{cat.min_points}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Pts máx</dt>
                              <dd>
                                {cat.max_points !== null ? (
                                  cat.max_points
                                ) : (
                                  <span className="italic text-muted-foreground/60">Sin límite</span>
                                )}
                              </dd>
                            </div>
                            {(cat.min_composite_pct !== null || cat.max_composite_pct !== null) && (
                              <>
                                <div>
                                  <dt className="text-muted-foreground">% mín</dt>
                                  <dd>{formatPct(cat.min_composite_pct)}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">% máx</dt>
                                  <dd>{formatPct(cat.max_composite_pct)}</dd>
                                </div>
                              </>
                            )}
                          </dl>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
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
            <AlertDialogTitle>{t("dialogs.deleteCategory.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.deleteCategory.description", {
                name: deletingCategory?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("dialogs.deleteCategory.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting
                ? t("dialogs.deleteCategory.confirmLoading")
                : t("dialogs.deleteCategory.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
