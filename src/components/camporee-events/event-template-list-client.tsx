"use client";

/**
 * EventTemplateListClient
 *
 * Client-side table + filter bar for the camporee event templates list page.
 * Mirrors ClubIdealListClient pattern.
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
import type { CamporeeEventActionState } from "@/lib/camporee-events/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;
type NavigationMode = "push" | "replace";
type FormAction = (
  prev: CamporeeEventActionState,
  data: FormData,
) => Promise<CamporeeEventActionState>;

interface EventTemplateListClientProps {
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
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function scopeLabel(scope: unknown): string {
  if (scope === "union") return "Unión";
  if (scope === "local_field") return "Campo local";
  return String(scope ?? "—");
}

function participantsSummary(item: AnyRecord): string {
  const mode = item.participants_mode;
  if (mode === "count") {
    return `${item.participants_count ?? "—"} participantes`;
  }
  if (mode === "by_class") {
    const rows = Array.isArray(item.participants_by_class) ? item.participants_by_class : [];
    return `${rows.length} clase(s)`;
  }
  return "—";
}

// ─── DeleteButton ─────────────────────────────────────────────────────────────

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("camporeeEvents.templates");
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

// ─── EventTemplateListClient ──────────────────────────────────────────────────

export function EventTemplateListClient({
  items,
  meta,
  canCreate,
  canEdit,
  canDelete,
  deleteAction,
}: EventTemplateListClientProps) {
  const t = useTranslations("camporeeEvents.templates");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [deleteItem, setDeleteItem] = useState<AnyRecord | null>(null);
  const [deleteState, deleteFormAction] = useActionState<CamporeeEventActionState, FormData>(
    deleteAction,
    {},
  );

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

  const currentSearch = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const currentScope = searchParams.get("scope") ?? "all";
  const currentStatus = searchParams.get("active") ?? "all";
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
    currentSearch || currentScope !== "all" || currentStatus !== "all",
  );
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <PageHeader title={t("listTitle")} description={t("description")}>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/camporees/event-templates/new">
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
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Filtros</h3>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              {/* Search */}
              <div className="w-[280px] space-y-1">
                <Label htmlFor="filter-search">{t("filterSearch")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="filter-search"
                    placeholder="Buscar por título..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              {/* Scope filter */}
              <div className="w-[180px] space-y-1">
                <Label htmlFor="filter-scope">{t("filterScope")}</Label>
                <Select
                  value={currentScope}
                  onValueChange={(v) => updateParam("scope", v)}
                >
                  <SelectTrigger id="filter-scope" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="union">{t("fieldScopeUnion")}</SelectItem>
                    <SelectItem value="local_field">{t("fieldScopeLocalField")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="w-[180px] space-y-1">
                <Label htmlFor="filter-status">{t("filterStatus")}</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(v) => updateParam("active", v)}
                >
                  <SelectTrigger id="filter-status" className="bg-background">
                    <SelectValue />
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
            title={hasActiveFilters ? "Sin resultados" : t("emptyTitle")}
            description={
              hasActiveFilters
                ? "No hay templates que coincidan con los filtros."
                : t("emptyDescription")
            }
          >
            {canCreate && !hasActiveFilters && (
              <Button asChild>
                <Link href="/dashboard/camporees/event-templates/new">
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
                    <TableHead>{t("colTitle")}</TableHead>
                    <TableHead>{t("colScope")}</TableHead>
                    <TableHead>{t("colEventType")}</TableHead>
                    <TableHead className="w-[100px]">{t("colMaxPoints")}</TableHead>
                    <TableHead>{t("colParticipants")}</TableHead>
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
                    const itemId = toPositiveInt(item.event_template_id);
                    const rowKey = itemId
                      ? `row-${itemId}`
                      : `row-idx-${(safePage - 1) * safeLimit + idx}`;
                    const titleText = toText(item.title) ?? "—";
                    const eventTypeName =
                      toText(
                        (item.event_type as AnyRecord)?.name ?? item.event_type_name,
                      ) ?? "—";

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">{titleText}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {scopeLabel(item.scope)}
                          </Badge>
                        </TableCell>
                        <TableCell>{eventTypeName}</TableCell>
                        <TableCell>{String(item.max_points ?? "—")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {participantsSummary(item)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.active !== false ? "soft-success" : "outline"}
                            className="text-xs"
                          >
                            {item.active !== false ? t("statusActive") : t("statusInactive")}
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
                                    href={`/dashboard/camporees/event-templates/${itemId}/edit`}
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
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit && itemId && (
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/dashboard/camporees/event-templates/${itemId}/edit`}
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
                  name: toText(deleteItem.title) ?? "este template",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("buttonCancel")}</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input
                  type="hidden"
                  name="id"
                  value={String(toPositiveInt(deleteItem.event_template_id) ?? "")}
                />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
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
