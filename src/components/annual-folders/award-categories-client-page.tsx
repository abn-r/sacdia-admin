"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
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
  labels: { allTypes: string; fallback: (id: number) => string },
): string {
  if (clubTypeId === null) return labels.allTypes;
  const found = clubTypes.find((ct) => ct.club_type_id === clubTypeId);
  return found?.name ?? labels.fallback(clubTypeId);
}

// ── 8.4-C: composite % formatting ─────────────────────────────────────────
function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

// ── 8.4-C Phase C: tier display ────────────────────────────────────────────
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
  const tCat = useTranslations("annual_folders.awardCategoriesClient");
  // A string (not `tCat`) in the fetch deps: the fetch effect must only re-run on scope/filter changes.
  const loadErrorMessage = tCat("loadError");

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
            : loadErrorMessage;
        toast.error(message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadErrorMessage],
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
          : tCat("deleteError");
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

  const scopeLabels: Record<AwardCategoryScope, string> = {
    club: tCat("scopeClub"),
    section: tCat("scopeSection"),
    member: tCat("scopeMember"),
  };
  const scopeLabel = scopeLabels[scope];
  const tierLabel = (tier: AwardTier) => tCat(`tier${tier}`);
  const typeLabels = {
    allTypes: tCat("allTypes"),
    fallback: (id: number) => tCat("typeFallback", { id }),
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Scope tabs (outer — 8.4-A) */}
      <Tabs value={scope} onValueChange={handleScopeChange}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label={tCat("scopeTabsAria")}>
            <TabsTrigger value="club">{scopeLabels.club}</TabsTrigger>
            <TabsTrigger value="section">{scopeLabels.section}</TabsTrigger>
            <TabsTrigger value="member">{scopeLabels.member}</TabsTrigger>
          </TabsList>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {tCat.rich("categoryCount", {
                count: categories.length,
                b: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
              })}
            </p>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={refreshCategories}
              disabled={isRefreshing}
              title={tCat("refresh")}
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">{tCat("refresh")}</span>
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-4" />
              {tCat("newCategory")}
            </Button>
          </div>
        </div>

        <TabsContent value={scope} className="mt-4 space-y-4">
          {/* Active / Legacy inner tabs */}
          <Tabs value={activeFilter} onValueChange={handleActiveFilterChange}>
            <TabsList variant="line" aria-label={tCat("statusTabsAria")}>
              <TabsTrigger value="active">{tCat("tabActive")}</TabsTrigger>
              <TabsTrigger value="legacy">{tCat("tabLegacy")}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4">
              {/* List */}
              {filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Plus className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    {activeFilter === "active"
                      ? tCat("emptyActiveTitle", { scope: scopeLabel.toLowerCase() })
                      : tCat("emptyLegacyTitle", { scope: scopeLabel.toLowerCase() })}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {activeFilter === "active"
                      ? tCat("emptyActiveDescription", { scope: scopeLabel.toLowerCase() })
                      : tCat("emptyLegacyDescription", { scope: scopeLabel.toLowerCase() })}
                  </p>
                  {activeFilter === "active" && (
                    <Button size="sm" className="mt-4" onClick={handleCreate}>
                      <Plus className="size-4" />
                      {tCat("newCategory")}
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
                              {tCat("colOrder")}
                            </SortableHeader>
                          </TableHead>
                          <TableHead
                            className="h-9 px-3"
                            aria-sort={sortField === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="name" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                              {tCat("colName")}
                            </SortableHeader>
                          </TableHead>
                          <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">{tCat("colClubType")}</TableHead>
                          <TableHead
                            className="h-9 w-24 px-3 text-center"
                            aria-sort={sortField === "min_points" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="min_points" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                              {tCat("colMinPoints")}
                            </SortableHeader>
                          </TableHead>
                          <TableHead
                            className="h-9 w-24 px-3 text-center"
                            aria-sort={sortField === "max_points" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="max_points" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                              {tCat("colMaxPoints")}
                            </SortableHeader>
                          </TableHead>
                          {/* 8.4-C composite % columns */}
                          <TableHead className="hidden h-9 w-24 px-3 text-center xl:table-cell text-xs font-medium text-muted-foreground">
                            {tCat("colMinPct")}
                          </TableHead>
                          <TableHead className="hidden h-9 w-24 px-3 text-center xl:table-cell text-xs font-medium text-muted-foreground">
                            {tCat("colMaxPct")}
                          </TableHead>
                          {/* 8.4-C Phase C tier column */}
                          <TableHead className="hidden h-9 w-28 px-3 text-center xl:table-cell text-xs font-medium text-muted-foreground">
                            {tCat("colTier")}
                          </TableHead>
                          <TableHead
                            className="h-9 w-20 px-3 text-center"
                            aria-sort={sortField === "active" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <SortableHeader field="active" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                              {tCat("colStatus")}
                            </SortableHeader>
                          </TableHead>
                          <RowActionsHead className="h-9 px-3" />
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
                                      {tCat("legacyBadge")}
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
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {clubTypeLabel(cat.club_type_id, clubTypes, typeLabels)}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {cat.min_points}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {cat.max_points !== null ? (
                                cat.max_points
                              ) : (
                                <span className="italic text-muted-foreground/60">
                                  {tCat("noLimit")}
                                </span>
                              )}
                            </TableCell>
                            {/* 8.4-C composite % cells */}
                            <TableCell className="hidden text-center text-sm text-muted-foreground xl:table-cell">
                              {formatPct(cat.min_composite_pct)}
                            </TableCell>
                            <TableCell className="hidden text-center text-sm text-muted-foreground xl:table-cell">
                              {formatPct(cat.max_composite_pct)}
                            </TableCell>
                            {/* 8.4-C Phase C tier cell */}
                            <TableCell className="hidden text-center xl:table-cell">
                              {cat.tier !== null ? (
                                <Badge
                                  variant={TIER_BADGE_VARIANT[cat.tier]}
                                  className="text-xs"
                                >
                                  {tierLabel(cat.tier)}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground/60">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <StatusBadge intent={flagStatusIntent(cat.active)} label={cat.active ? tCat("statusActive") : tCat("statusInactive")} size="sm" />
                            </TableCell>
                            <TableCell className="text-right">
                              <RowActions
                                label={cat.name}
                                actions={[
                                  {
                                    label: tCat("actionEdit"),
                                    icon: Pencil,
                                    onSelect: () => handleEdit(cat),
                                    disabled: cat.is_legacy,
                                  },
                                  {
                                    label: tCat("actionDelete"),
                                    icon: Trash2,
                                    destructive: true,
                                    onSelect: () => handleDelete(cat),
                                  },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: category cards */}
                  <ul className="space-y-3 md:hidden" aria-label={tCat("categoriesAria", { scope: scopeLabel })}>
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
                                      {tCat("legacyBadge")}
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
                                title={t("awardCategoriesClient.editCategoryTitle")}
                                disabled={cat.is_legacy}
                              >
                                <Pencil className="size-3.5" />
                                <span className="sr-only">{tCat("editSr")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDelete(cat)}
                                title={t("awardCategoriesClient.deleteCategoryTitle")}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">{tCat("deleteSr")}</span>
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <StatusBadge intent={flagStatusIntent(cat.active)} label={cat.active ? tCat("statusActive") : tCat("statusInactive")} size="sm" />
                            {cat.tier !== null && (
                              <Badge
                                variant={TIER_BADGE_VARIANT[cat.tier]}
                                className="text-xs"
                              >
                                {tierLabel(cat.tier)}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {clubTypeLabel(cat.club_type_id, clubTypes, typeLabels)}
                            </span>
                          </div>

                          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                            <div>
                              <dt className="text-muted-foreground">{tCat("minPtsShort")}</dt>
                              <dd>{cat.min_points}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">{tCat("maxPtsShort")}</dt>
                              <dd>
                                {cat.max_points !== null ? (
                                  cat.max_points
                                ) : (
                                  <span className="italic text-muted-foreground/60">{tCat("noLimit")}</span>
                                )}
                              </dd>
                            </div>
                            {(cat.min_composite_pct !== null || cat.max_composite_pct !== null) && (
                              <>
                                <div>
                                  <dt className="text-muted-foreground">{tCat("minPctShort")}</dt>
                                  <dd>{formatPct(cat.min_composite_pct)}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">{tCat("maxPctShort")}</dt>
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
              variant="destructive-solid"
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
