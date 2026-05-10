"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { CategoryFormDialog } from "@/app/(dashboard)/dashboard/achievements/_components/category-form-dialog";
import type { AchievementActionState } from "@/lib/achievements/actions";

type CategoryRecord = Record<string, unknown>;
type NavigationMode = "push" | "replace";

type FormAction = (
  prevState: AchievementActionState,
  formData: FormData,
) => Promise<AchievementActionState>;

interface Props {
  items: CategoryRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function pickId(item: CategoryRecord): number | null {
  return toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id);
}

function pickName(item: CategoryRecord): string {
  return toText(item.name) ?? toText(item.title) ?? "—";
}

function DeleteButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="submit"
      variant="destructive"
      onClick={() => setPending(true)}
      disabled={pending}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function AchievementCategoriesCrudPage({
  items,
  meta,
  createAction,
  updateAction,
  deleteAction,
}: Props) {
  const t = useTranslations("achievements.crud.categories");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CategoryRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<CategoryRecord | null>(null);

  const [createState, createFormAction] = useActionState<AchievementActionState, FormData>(createAction, {});
  const [updateState, updateFormAction] = useActionState<AchievementActionState, FormData>(updateAction, {});
  const [deleteState, deleteFormAction] = useActionState<AchievementActionState, FormData>(deleteAction, {});

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [searchParamsString]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string, mode: NavigationMode = "push") => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();

      if (!normalized || normalized === "all") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }

      if (key === "search") {
        params.delete("name");
        params.delete("q");
      }

      params.set("page", "1");
      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (mode === "replace") {
        router.replace(nextUrl);
        return;
      }
      router.push(nextUrl);
    },
    [pathname, router],
  );

  const currentSearch = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const currentStatusFilter = searchParams.get("active") ?? "all";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("search", value, "replace");
      }, 400);
    },
    [updateParam],
  );

  const hasActiveFilters = Boolean(currentSearch || currentStatusFilter !== "all");
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("newButton")}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {/* Filters */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">{t("filtersTitle")}</h3>
            <span className="text-xs text-muted-foreground">{t("filtersSubtitle")}</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
                <Label htmlFor="cat-filter-name">{t("filterName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cat-filter-name"
                    placeholder={t("filterNamePlaceholder")}
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px] space-y-1">
                <Label htmlFor="cat-filter-status">{t("filterStatus")}</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(value) => updateParam("active", value)}
                >
                  <SelectTrigger id="cat-filter-status" className="bg-background">
                    <SelectValue placeholder={t("filterStatusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filterStatusAll")}</SelectItem>
                    <SelectItem value="true">{t("filterStatusActive")}</SelectItem>
                    <SelectItem value="false">{t("filterStatusInactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table / Empty */}
        {items.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={hasActiveFilters ? t("emptyFiltersTitle") : t("emptyNoFiltersTitle")}
            description={
              hasActiveFilters
                ? t("emptyFiltersDescription")
                : t("emptyNoFiltersDescription")
            }
          >
            {!hasActiveFilters && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t("newButton")}
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tableColName")}</TableHead>
                    <TableHead>{t("tableColDescription")}</TableHead>
                    <TableHead>{t("tableColIcon")}</TableHead>
                    <TableHead>{t("tableColOrder")}</TableHead>
                    <TableHead>{t("tableColStatus")}</TableHead>
                    <TableHead className="sticky right-0 z-20 w-[120px] border-l bg-background text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("tableColActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const categoryId = pickId(item);
                    const categoryName = pickName(item);
                    const rowKey = categoryId
                      ? `achievement-cat-${categoryId}`
                      : `achievement-cat-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey} className="transition-colors hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {categoryId ? (
                            <Link
                              href={`/dashboard/achievements/${categoryId}`}
                              className="flex items-center gap-1.5 text-primary hover:underline"
                            >
                              {categoryName}
                              <ChevronRight className="size-3.5 text-muted-foreground" />
                            </Link>
                          ) : (
                            categoryName
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {toText(item.description) ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {toText(item.icon) ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {item.display_order != null ? String(item.display_order) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.active !== false ? "success" : "secondary"} className="text-xs">
                            {item.active !== false ? t("statusActive") : t("statusInactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 border-l bg-background">
                          <div className="hidden gap-1 md:flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={!categoryId}
                              onClick={() => setEditItem(item)}
                              title={t("actionEdit")}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              disabled={!categoryId}
                              onClick={() => setDeleteItem(item)}
                              title={t("actionDelete")}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  disabled={!categoryId}
                                  onSelect={() => setEditItem(item)}
                                >
                                  <Pencil className="size-4" />
                                  {t("actionEdit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!categoryId}
                                  variant="destructive"
                                  onSelect={() => setDeleteItem(item)}
                                >
                                  <Trash2 className="size-4" />
                                  {t("actionDelete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination
              page={safePage}
              totalPages={safeTotalPages}
              total={meta.total}
              limit={safeLimit}
              limitOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </div>

      {/* Create Dialog */}
      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        formAction={createFormAction}
        actionState={createState}
      />

      {/* Edit Dialog */}
      {editItem && (
        <CategoryFormDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          mode="edit"
          item={editItem}
          formAction={updateFormAction}
          actionState={updateState}
        />
      )}

      {/* Delete AlertDialog */}
      {deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription", { name: pickName(deleteItem) })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteCancelButton")}</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input type="hidden" name="id" value={String(pickId(deleteItem) ?? "")} />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
                )}
                <DeleteButton label={t("deleteConfirmButton")} />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
