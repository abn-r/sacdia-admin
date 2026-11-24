"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState, ErrorStateTableRow } from "@/components/shared/error-state";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { useToastError } from "@/lib/feedback/toast-retry";
import { apiRequestFromClient } from "@/lib/api/client";
import { deleteResource, type ScopeLevel } from "@/lib/api/resources";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  extractResourceSignedUrl,
  pickCategoryName,
  pickClubTypeIdValue,
  pickClubTypeLabel,
  pickResourceId,
  pickUploader,
  toText,
} from "@/lib/resources/resource-display";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_ICONS,
  SCOPE_LEVELS,
  describeScope,
  externalHost,
  fileExtension,
  formatFileSize,
  toResourceType,
  type CategoryOption,
  type ResourceRecord,
  type ResourcesLoadFailure,
} from "@/components/resources/resource-meta";

const BASE_PATH = "/dashboard/resources";
const NEW_PATH = "/dashboard/resources/new";
const COLUMN_COUNT = 8;

interface ResourcesCrudPageProps {
  items: ResourceRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  categories: CategoryOption[];
  clubTypes: ClubType[];
  unions: Union[];
  localFields: LocalField[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** The list request failed. Never rendered as an empty list. */
  loadError?: ResourcesLoadFailure | null;
  /** ISO time of this server render; keeps the last good data labelled when a reload fails. */
  loadedAt: string;
}

type Snapshot = {
  items: ResourceRecord[];
  meta: ResourcesCrudPageProps["meta"];
  loadedAt: string;
  good: boolean;
};

export function ResourcesCrudPage({
  items,
  meta,
  categories,
  clubTypes,
  unions,
  localFields,
  canCreate,
  canEdit,
  canDelete,
  loadError = null,
  loadedAt,
}: ResourcesCrudPageProps) {
  const t = useTranslations("ops.resources");
  const tLegacy = useTranslations("resources");
  const format = useFormatter();
  const toastError = useToastError();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [editItem, setEditItem] = useState<ResourceRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<ResourceRecord | null>(null);

  // Keep the last good page so a failed reload shows it, labelled, instead of emptying the list.
  const [snapshot, setSnapshot] = useState<Snapshot>({
    items,
    meta,
    loadedAt,
    good: !loadError,
  });
  if (!loadError && snapshot.loadedAt !== loadedAt) {
    setSnapshot({ items, meta, loadedAt, good: true });
  }
  const showStale = Boolean(loadError) && snapshot.good;
  const rows = loadError ? (snapshot.good ? snapshot.items : []) : items;
  const pageMeta = loadError && snapshot.good ? snapshot.meta : meta;

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
    (key: string, value: string, mode: "push" | "replace" = "push") => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized || normalized === "all") params.delete(key);
      else params.set(key, normalized);
      params.set("page", "1");
      const queryString = params.toString();
      const nextUrl = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
      if (mode === "replace") router.replace(nextUrl);
      else router.push(nextUrl);
    },
    [router],
  );

  const currentSearch = searchParams.get("search") ?? "";
  const currentType = searchParams.get("resource_type") ?? "all";
  const currentCategory = searchParams.get("category_id") ?? "all";
  const currentClubType = searchParams.get("club_type_id") ?? "all";
  const currentScope = searchParams.get("scope_level") ?? "all";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateParam("search", value, "replace"), 400);
    },
    [updateParam],
  );

  const hasActiveFilters = Boolean(
    currentSearch ||
      currentType !== "all" ||
      currentCategory !== "all" ||
      currentClubType !== "all" ||
      currentScope !== "all",
  );

  const safePage = Math.max(1, pageMeta.page || 1);
  const safeLimit = Math.max(1, pageMeta.limit || 20);
  const safeTotalPages = Math.max(1, pageMeta.totalPages || 1);

  async function openResource(item: ResourceRecord) {
    const id = pickResourceId(item);
    if (!id) return;
    const externalUrl = toText(item.external_url);

    if (toResourceType(item.resource_type) === "video_link" && externalUrl && /^https?:\/\//i.test(externalUrl)) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const result = await apiRequestFromClient<unknown>(`/resources/${id}/signed-url`);
      const url = extractResourceSignedUrl(result);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      throw new Error("missing url");
    } catch {
      toastError({
        title: tLegacy("toasts.download_link_failed"),
        onRetry: () => void openResource(item),
      });
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    const id = pickResourceId(deleteItem);
    if (!id) return;
    await deleteResource(id);
    toast.success(t("delete.success"));
    router.refresh();
  }

  function scopeCell(item: ResourceRecord) {
    const scope = describeScope(item, unions, localFields);
    if (!scope) return { primary: "—", secondary: null as string | null };
    if (scope.level === "system") return { primary: t("levels.system"), secondary: null };
    const primary =
      scope.name ??
      (scope.id
        ? scope.level === "union"
          ? t("scope.unionId", { id: scope.id })
          : scope.level === "division"
            ? t("scope.divisionId", { id: scope.id })
            : t("scope.localFieldId", { id: scope.id })
        : t(`levels.${scope.level}`));
    return { primary, secondary: t(`levels.${scope.level}`) };
  }

  function clubLabel(item: ResourceRecord) {
    return pickClubTypeIdValue(item) === "all" && !item.club_type
      ? t("upload.fields.allClubs")
      : pickClubTypeLabel(item, clubTypes);
  }

  function formatDate(value: unknown) {
    if (typeof value !== "string" || !value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : format.dateTime(date, { dateStyle: "medium" });
  }

  function subline(item: ResourceRecord) {
    const type = toResourceType(item.resource_type);
    if (type === "video_link") return externalHost(toText(item.external_url)) ?? "";
    if (type === "text") return "";
    const ext = fileExtension(toText(item.file_url) ?? toText(item.file_name));
    return [ext, formatFileSize(item.file_size)].filter(Boolean).join(" · ");
  }

  function rowActions(item: ResourceRecord, title: string) {
    const type = toResourceType(item.resource_type);
    const itemId = pickResourceId(item);
    return (
      <RowActions
        label={title}
        actions={[
          {
            label: type === "video_link" ? t("actions.openLink") : t("actions.download"),
            icon: type === "video_link" ? ExternalLink : Download,
            onSelect: () => void openResource(item),
            hidden: type === "text",
            disabled: !itemId,
          },
          {
            label: t("actions.edit"),
            icon: Pencil,
            onSelect: () => setEditItem(item),
            hidden: !canEdit,
            disabled: !itemId,
          },
          {
            label: `${t("actions.delete")}…`,
            icon: Trash2,
            destructive: true,
            onSelect: () => setDeleteItem(item),
            hidden: !canDelete,
            disabled: !itemId,
          },
        ]}
      />
    );
  }

  const showEmpty = !loadError && rows.length === 0;
  const failure = loadError && !showStale ? loadError : null;
  const errorDetail = failure?.detail
    ? { code: failure.detail.code, at: failure.detail.at }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ListFilterField id="res-filter-search" label={t("filters.search")} className="w-[260px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="res-filter-search"
              className="pl-9"
              placeholder={tLegacy("placeholders.searchTitle")}
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
        </ListFilterField>

        <ListFilterField id="res-filter-type" label={t("filters.type")}>
          <Select value={currentType} onValueChange={(v) => updateParam("resource_type", v)}>
            <SelectTrigger id="res-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.typeAll")}</SelectItem>
              {RESOURCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListFilterField>

        <ListFilterField id="res-filter-scope" label={t("filters.scope")}>
          <Select value={currentScope} onValueChange={(v) => updateParam("scope_level", v)}>
            <SelectTrigger id="res-filter-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.scopeAll")}</SelectItem>
              {SCOPE_LEVELS.map((level: ScopeLevel) => (
                <SelectItem key={level} value={level}>
                  {t(`levels.${level}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListFilterField>

        {categories.length > 0 && (
          <ListFilterField id="res-filter-category" label={t("filters.category")}>
            <Select value={currentCategory} onValueChange={(v) => updateParam("category_id", v)}>
              <SelectTrigger id="res-filter-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.categoryAll")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem
                    key={category.resource_category_id}
                    value={String(category.resource_category_id)}
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ListFilterField>
        )}

        <ListFilterField id="res-filter-club-type" label={t("filters.clubType")}>
          <Select value={currentClubType} onValueChange={(v) => updateParam("club_type_id", v)}>
            <SelectTrigger id="res-filter-club-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.clubTypeAll")}</SelectItem>
              {clubTypes.map((clubType) => (
                <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                  {clubType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListFilterField>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={() => router.push(BASE_PATH)}>
            {t("filters.clear")}
          </Button>
        )}
      </div>

      {showStale && <StaleDataNotice at={snapshot.loadedAt} retry />}

      {showEmpty ? (
        <EmptyState
          icon={FileText}
          variant={hasActiveFilters ? "no-results" : "default"}
          title={hasActiveFilters ? t("empty.noResultsTitle") : t("empty.title")}
          description={hasActiveFilters ? t("empty.noResultsDescription") : t("empty.description")}
        >
          {hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={() => router.push(BASE_PATH)}>
              {t("filters.clear")}
            </Button>
          ) : canCreate ? (
            <Button asChild>
              <Link href={NEW_PATH}>
                <Plus aria-hidden />
                {t("actions.upload")}
              </Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {/* md+: table */}
          <DataTableShell className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">{t("columns.resource")}</TableHead>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.category")}</TableHead>
                  <TableHead className="min-w-[180px]">{t("columns.scope")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("columns.clubType")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("columns.uploader")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("columns.date")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {failure ? (
                  <ErrorStateTableRow
                    colSpan={COLUMN_COUNT}
                    kind={failure.kind}
                    retry
                    icon={FileText}
                    detail={errorDetail}
                  />
                ) : (
                  rows.map((item, index) => {
                    const itemId = pickResourceId(item);
                    const title = toText(item.title) ?? toText(item.name) ?? "—";
                    const type = toResourceType(item.resource_type);
                    const TypeIcon = type ? RESOURCE_TYPE_ICONS[type] : FileText;
                    const scope = scopeCell(item);
                    const sub = subline(item);
                    const rowKey = itemId
                      ? `res-${itemId}`
                      : `res-row-${(safePage - 1) * safeLimit + index}`;
                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="whitespace-normal">
                          <div className="flex items-center gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                              <TypeIcon className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium">{title}</p>
                              {sub && (
                                <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{type ? t(`types.${type}`) : t("types.unknown")}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {pickCategoryName(item)}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <p>{scope.primary}</p>
                          {scope.secondary && (
                            <p className="text-xs text-muted-foreground">{scope.secondary}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground xl:table-cell">
                          {clubLabel(item)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground xl:table-cell">
                          {pickUploader(item)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground tabular-nums xl:table-cell">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell>{rowActions(item, title)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTableShell>

          {/* <md: two-line rows */}
          <div className="md:hidden">
            {failure ? (
              <DataTableShell>
                <ErrorState
                  kind={failure.kind}
                  retry
                  icon={FileText}
                  detail={errorDetail}
                />
              </DataTableShell>
            ) : (
              <ul className="divide-y rounded-xl bg-card shadow-card">
                {rows.map((item, index) => {
                  const itemId = pickResourceId(item);
                  const title = toText(item.title) ?? toText(item.name) ?? "—";
                  const type = toResourceType(item.resource_type);
                  const TypeIcon = type ? RESOURCE_TYPE_ICONS[type] : FileText;
                  const scope = scopeCell(item);
                  return (
                    <li
                      key={itemId ? `res-m-${itemId}` : `res-m-row-${index}`}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <TypeIcon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{title}</p>
                        <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground">
                          <span>{type ? t(`types.${type}`) : t("types.unknown")}</span>
                          <span>{pickCategoryName(item)}</span>
                          <span>
                            {scope.primary}
                            {scope.secondary ? ` · ${scope.secondary}` : ""}
                          </span>
                        </p>
                      </div>
                      {rowActions(item, title)}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!failure && (
            <DataTablePagination
              page={safePage}
              totalPages={safeTotalPages}
              total={pageMeta.total}
              limit={safeLimit}
              limitOptions={[10, 20, 50, 100]}
            />
          )}
        </>
      )}

      {canEdit && editItem && (
        <ResourceEditDialog
          item={editItem}
          categories={categories}
          clubTypes={clubTypes}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={canDelete && deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        tone="destructive"
        title={t("delete.title", { name: deleteItem ? (toText(deleteItem.title) ?? "—") : "" })}
        description={t("delete.description")}
        confirmLabel={t("actions.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
