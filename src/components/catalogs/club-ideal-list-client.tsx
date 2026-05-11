"use client";

/**
 * ClubIdealListClient
 *
 * Client-side table + filter bar for the club-ideals list page.
 * Receives pre-fetched data from the server component.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import type { GenericCatalogActionState } from "@/lib/generic-catalogs-i18n/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;
type NavigationMode = "push" | "replace";
type FormAction = (
  prev: GenericCatalogActionState,
  data: FormData,
) => Promise<GenericCatalogActionState>;

interface ClubIdealListClientProps {
  items: AnyRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleteAction: FormAction;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

// ─── DeleteButton ─────────────────────────────────────────────────────────────

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("catalogs.pages.clubIdeals");
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {t("buttonDelete")}
    </Button>
  );
}

// ─── ClubIdealListClient ──────────────────────────────────────────────────────

export function ClubIdealListClient({
  items,
  meta,
  canCreate,
  canEdit,
  canDelete,
  deleteAction,
}: ClubIdealListClientProps) {
  const t = useTranslations("catalogs.pages.clubIdeals");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [deleteItem, setDeleteItem] = useState<AnyRecord | null>(null);
  const [deleteState, deleteFormAction] = useActionState<
    GenericCatalogActionState,
    FormData
  >(deleteAction, {});

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
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
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    },
    [pathname, router],
  );

  const currentSearch =
    searchParams.get("search") ??
    searchParams.get("name") ??
    searchParams.get("q") ??
    "";
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

  const hasActiveFilters = Boolean(
    currentSearch || currentStatusFilter !== "all",
  );
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader title={t("listTitle")} description={t("description")}>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/catalogs/club-ideals/new">
              <Plus className="size-4" />
              {t("buttonCreate")}
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        {/* Filter bar */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              Filtros
            </h3>
            <span className="text-xs text-muted-foreground">
              Refina el listado por campo
            </span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
                <Label htmlFor="filter-search">{t("fieldName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="filter-search"
                    placeholder="Buscar por nombre..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px] space-y-1">
                <Label htmlFor="filter-status">{t("colStatus")}</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(v) => updateParam("active", v)}
                >
                  <SelectTrigger id="filter-status" className="bg-background">
                    <SelectValue placeholder={t("colStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="true">{t("statusActive")}</SelectItem>
                    <SelectItem value="false">{t("statusInactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table / empty state */}
        {items.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              hasActiveFilters
                ? "Sin resultados"
                : t("emptyTitle")
            }
            description={
              hasActiveFilters
                ? "No hay ideales que coincidan con los filtros."
                : t("emptyDescription")
            }
          >
            {canCreate && !hasActiveFilters && (
              <Button asChild>
                <Link href="/dashboard/catalogs/club-ideals/new">
                  <Plus className="size-4" />
                  {t("buttonCreate")}
                </Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colName")}</TableHead>
                    <TableHead>{t("colClubType")}</TableHead>
                    <TableHead className="w-[80px]">{t("colIdealOrder")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                        {t("colActions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const itemId = toPositiveInt(item.club_ideal_id);
                    const itemName = toText(item.name) ?? "—";
                    const clubTypeName =
                      toText(
                        (item.club_type as Record<string, unknown>)?.name ??
                          item.club_type_name,
                      ) ?? "—";
                    const idealOrder = toPositiveInt(item.ideal_order) ?? "—";
                    const rowKey = itemId
                      ? `row-${itemId}`
                      : `row-idx-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">{itemName}</TableCell>
                        <TableCell>{clubTypeName}</TableCell>
                        <TableCell>{idealOrder}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.active !== false ? "soft-success" : "outline"
                            }
                            className="text-xs"
                          >
                            {item.active !== false
                              ? t("statusActive")
                              : t("statusInactive")}
                          </Badge>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="sticky right-0 z-10 border-l bg-background">
                            <div className="hidden gap-1 md:flex">
                              {canEdit && itemId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  asChild
                                  title="Editar"
                                >
                                  <Link
                                    href={`/dashboard/catalogs/club-ideals/${itemId}/edit`}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Link>
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  disabled={!itemId}
                                  onClick={() => setDeleteItem(item)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit && itemId && (
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/dashboard/catalogs/club-ideals/${itemId}/edit`}
                                      >
                                        <Pencil className="size-4" />
                                        Editar
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      disabled={!itemId}
                                      variant="destructive"
                                      onSelect={() => setDeleteItem(item)}
                                    >
                                      <Trash2 className="size-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
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

      {/* Delete confirmation dialog */}
      {canDelete && deleteItem && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => {
            if (!open) setDeleteItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmDesc", {
                  name: toText(deleteItem.name) ?? "este ideal",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("buttonCancel")}</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input
                  type="hidden"
                  name="id"
                  value={String(toPositiveInt(deleteItem.club_ideal_id) ?? "")}
                />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">
                    {deleteState.error}
                  </p>
                )}
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
