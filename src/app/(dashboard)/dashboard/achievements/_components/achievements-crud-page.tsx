"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import type { AchievementTier, AchievementType } from "@/lib/api/achievements";
import type { AchievementActionState } from "@/lib/achievements/actions";

type AchievementRecord = Record<string, unknown>;
type NavigationMode = "push" | "replace";

type FormAction = (
  prevState: AchievementActionState,
  formData: FormData,
) => Promise<AchievementActionState>;

interface Props {
  achievements: AchievementRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  categoryId: number;
  categoryName: string;
  deleteAction: FormAction;
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_COLORS: Record<AchievementTier, string> = {
  BRONZE: "#CD7F32",
  SILVER: "#C0C0C0",
  GOLD: "#FFD700",
  PLATINUM: "#E5E4E2",
  DIAMOND: "#B9F2FF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function pickId(item: AchievementRecord): number | null {
  return toPositiveNumber(item.achievement_id ?? item.id);
}

function pickName(item: AchievementRecord): string {
  return toText(item.name) ?? "—";
}

function pickTier(item: AchievementRecord): AchievementTier | null {
  const tier = toText(item.tier);
  if (!tier) return null;
  return tier as AchievementTier;
}

function pickType(item: AchievementRecord): AchievementType | null {
  const type = toText(item.type);
  if (!type) return null;
  return type as AchievementType;
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AchievementsCrudPage({
  achievements,
  meta,
  categoryId,
  categoryName,
  deleteAction,
}: Props) {
  const t = useTranslations("achievements.crud.list");
  const tPreview = useTranslations("achievements.cards.preview");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [deleteItem, setDeleteItem] = useState<AchievementRecord | null>(null);

  const [deleteState, deleteFormAction] = useActionState<AchievementActionState, FormData>(
    deleteAction,
    {},
  );

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

      if (key === "search") params.delete("q");
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

  const currentSearch = searchParams.get("search") ?? "";
  const currentTypeFilter = searchParams.get("type") ?? "all";
  const currentTierFilter = searchParams.get("tier") ?? "all";
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
    currentSearch ||
    currentTypeFilter !== "all" ||
    currentTierFilter !== "all" ||
    currentStatusFilter !== "all",
  );

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/achievements">{t("breadcrumbRoot")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{categoryName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{categoryName}</h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/achievements/${categoryId}/new`}>
            <Plus className="size-4" />
            {t("newButton")}
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">{t("filtersTitle")}</h3>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max flex-wrap items-end gap-4">
              <div className="w-[260px] space-y-1">
                <Label htmlFor="ach-filter-name">{t("filterName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ach-filter-name"
                    placeholder={t("filterNamePlaceholder")}
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              <div className="w-[160px] space-y-1">
                <Label htmlFor="ach-filter-type">{t("filterType")}</Label>
                <Select
                  value={currentTypeFilter}
                  onValueChange={(v) => updateParam("type", v)}
                >
                  <SelectTrigger id="ach-filter-type" className="bg-background">
                    <SelectValue placeholder={t("filterTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filterTypeAll")}</SelectItem>
                    <SelectItem value="THRESHOLD">{tPreview("typeLabels.THRESHOLD")}</SelectItem>
                    <SelectItem value="STREAK">{tPreview("typeLabels.STREAK")}</SelectItem>
                    <SelectItem value="COMPOUND">{tPreview("typeLabels.COMPOUND")}</SelectItem>
                    <SelectItem value="MILESTONE">{tPreview("typeLabels.MILESTONE")}</SelectItem>
                    <SelectItem value="COLLECTION">{tPreview("typeLabels.COLLECTION")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[160px] space-y-1">
                <Label htmlFor="ach-filter-tier">{t("filterTier")}</Label>
                <Select
                  value={currentTierFilter}
                  onValueChange={(v) => updateParam("tier", v)}
                >
                  <SelectTrigger id="ach-filter-tier" className="bg-background">
                    <SelectValue placeholder={t("filterTierPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filterTierAll")}</SelectItem>
                    <SelectItem value="BRONZE">{tPreview("tierLabels.BRONZE")}</SelectItem>
                    <SelectItem value="SILVER">{tPreview("tierLabels.SILVER")}</SelectItem>
                    <SelectItem value="GOLD">{tPreview("tierLabels.GOLD")}</SelectItem>
                    <SelectItem value="PLATINUM">{tPreview("tierLabels.PLATINUM")}</SelectItem>
                    <SelectItem value="DIAMOND">{tPreview("tierLabels.DIAMOND")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[160px] space-y-1">
                <Label htmlFor="ach-filter-status">{t("filterStatus")}</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(v) => updateParam("active", v)}
                >
                  <SelectTrigger id="ach-filter-status" className="bg-background">
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
        {achievements.length === 0 ? (
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
              <Button asChild>
                <Link href={`/dashboard/achievements/${categoryId}/new`}>
                  <Plus className="size-4" />
                  {t("newButton")}
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
                    <TableHead>{t("tableColName")}</TableHead>
                    <TableHead>{t("tableColType")}</TableHead>
                    <TableHead>{t("tableColTier")}</TableHead>
                    <TableHead>{t("tableColPoints")}</TableHead>
                    <TableHead>{t("tableColScope")}</TableHead>
                    <TableHead>{t("tableColSecret")}</TableHead>
                    <TableHead>{t("tableColStatus")}</TableHead>
                    <TableHead className="sticky right-0 z-20 w-[120px] border-l bg-background text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("tableColActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achievements.map((item, idx) => {
                    const achId = pickId(item);
                    const achName = pickName(item);
                    const tier = pickTier(item);
                    const type = pickType(item);
                    const rowKey = achId
                      ? `achievement-${achId}`
                      : `achievement-row-${(safePage - 1) * safeLimit + idx}`;

                    return (
                      <TableRow
                        key={rowKey}
                        className="animate-in fade-in slide-in-from-bottom-2 transition-colors hover:bg-muted/30"
                        style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                      >
                        <TableCell className="font-medium">{achName}</TableCell>

                        <TableCell>
                          {type ? (
                            <Badge variant="secondary" className="text-xs">
                              {tPreview(`typeLabels.${type}`)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell>
                          {tier ? (
                            <Badge
                              variant="outline"
                              className="gap-1.5 text-xs"
                              style={{
                                borderColor: `${TIER_COLORS[tier]}60`,
                                color: TIER_COLORS[tier],
                              }}
                            >
                              <span
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: TIER_COLORS[tier] }}
                                aria-hidden
                              />
                              {tPreview(`tierLabels.${tier}`)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="tabular-nums text-sm">
                          {item.points != null ? String(item.points) : "—"}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {toText(item.scope) ?? "—"}
                        </TableCell>

                        <TableCell>
                          {item.secret ? (
                            <EyeOff className="size-4 text-muted-foreground" aria-label={t("ariaSecret")} />
                          ) : (
                            <Eye className="size-4 text-muted-foreground/40" aria-label={t("ariaVisible")} />
                          )}
                          {Boolean(item.repeatable) && (
                            <RefreshCw className="ml-1 inline size-3.5 text-muted-foreground" aria-label={t("ariaRepeatable")} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={item.active !== false ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {item.active !== false ? t("statusActive") : t("statusInactive")}
                          </Badge>
                        </TableCell>

                        <TableCell className="sticky right-0 z-10 border-l bg-background">
                          <div className="hidden gap-1 md:flex">
                            {achId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                asChild
                                title={t("actionEdit")}
                              >
                                <Link
                                  href={`/dashboard/achievements/${categoryId}/${achId}/edit`}
                                >
                                  <Pencil className="size-3.5" />
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                disabled
                                title={t("actionEdit")}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              disabled={!achId}
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
                                {achId ? (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/dashboard/achievements/${categoryId}/${achId}/edit`}
                                    >
                                      <Pencil className="size-4" />
                                      {t("actionEdit")}
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Pencil className="size-4" />
                                    {t("actionEdit")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  disabled={!achId}
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
                <input type="hidden" name="category_id" value={String(categoryId)} />
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
