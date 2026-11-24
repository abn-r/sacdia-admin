"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { useToastError } from "@/lib/feedback/toast-retry";
import {
  createResourceCategory,
  deleteResourceCategory,
  updateResourceCategory,
} from "@/lib/api/resources";
import type { ResourcesLoadFailure } from "@/components/resources/resource-meta";

type CategoryRecord = Record<string, unknown>;

const CATEGORIES_PATH = "/dashboard/resources?tab=categories";
const COLUMN_COUNT = 4;

interface ResourceCategoriesCrudPageProps {
  items: CategoryRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** The categories request failed. Never rendered as an empty list. */
  loadError?: ResourcesLoadFailure | null;
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
  return toPositiveNumber(item.resource_category_id ?? item.category_id ?? item.id);
}

function pickName(item: CategoryRecord): string {
  return toText(item.name) ?? toText(item.title) ?? "—";
}

type CategoryFormDialogProps = {
  /** Category being edited; null creates a new one. */
  item: CategoryRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

function CategoryFormDialog({ item, onClose, onSaved }: CategoryFormDialogProps) {
  const t = useTranslations("resources.categoriesCrud");
  const tOps = useTranslations("ops.resources");
  const toastError = useToastError();
  const ids = useId();
  const [name, setName] = useState(toText(item?.name) ?? "");
  const [description, setDescription] = useState(toText(item?.description) ?? "");
  const [active, setActive] = useState(item ? item.active !== false : true);
  const [saving, setSaving] = useState(false);
  const itemId = item ? pickId(item) : null;

  async function save() {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toastError({ title: tOps("categories.saveFailed"), description: tOps("categories.nameRequired") });
      return;
    }
    setSaving(true);
    try {
      if (item && itemId) {
        await updateResourceCategory(itemId, {
          name: trimmed,
          description: description.trim(),
          active,
        });
        toast.success(tOps("categories.updated"));
      } else {
        await createResourceCategory({
          name: trimmed,
          description: description.trim() || undefined,
          active,
        });
        toast.success(tOps("categories.created"));
      }
      onSaved();
    } catch (error) {
      toastError({
        title: tOps("categories.saveFailed"),
        description: error instanceof Error && error.message ? error.message : undefined,
        onRetry: save,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? t("editDialogTitle") : t("createDialogTitle")}</DialogTitle>
          {!item && <DialogDescription>{t("createDialogDesc")}</DialogDescription>}
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor={`${ids}-name`}>
              {t("fieldName")} <span className="text-destructive" aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              id={`${ids}-name`}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("fieldNamePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${ids}-description`}>{t("fieldDescription")}</FieldLabel>
            <Textarea
              id={`${ids}-description`}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
            />
          </Field>
          <Field orientation="horizontal">
            <Switch id={`${ids}-active`} checked={active} onCheckedChange={setActive} />
            <FieldLabel htmlFor={`${ids}-active`}>{t("fieldActive")}</FieldLabel>
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {item ? t("saveChanges") : t("createSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Body of the "Categorías" tab: filters, table, and create/edit/delete. */
export function ResourceCategoriesCrudPage({
  items,
  meta,
  canCreate,
  canEdit,
  canDelete,
  loadError = null,
}: ResourceCategoriesCrudPageProps) {
  const t = useTranslations("resources.categoriesCrud");
  const tOps = useTranslations("ops.resources");
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const [formItem, setFormItem] = useState<{ item: CategoryRecord | null } | null>(null);
  const [deleteItem, setDeleteItem] = useState<CategoryRecord | null>(null);

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
      params.set("tab", "categories");
      const normalized = value.trim();
      if (!normalized || normalized === "all") params.delete(key);
      else params.set(key, normalized);
      params.set("page", "1");
      const nextUrl = `/dashboard/resources?${params.toString()}`;
      if (mode === "replace") router.replace(nextUrl);
      else router.push(nextUrl);
    },
    [router],
  );

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("active") ?? "all";
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

  const hasActiveFilters = Boolean(currentSearch || currentStatus !== "all");
  const hasActions = canEdit || canDelete;
  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);
  const showEmpty = !loadError && items.length === 0;

  const statusLabels = { active: t("statusActive"), inactive: t("statusInactive") };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <ListFilterField id="rc-filter-name" label={t("filterName")} className="w-[260px]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="rc-filter-name"
                className="pl-9"
                placeholder={t("filterNamePlaceholder")}
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>
          </ListFilterField>
          <ListFilterField id="rc-filter-status" label={t("filterStatus")}>
            <Select value={currentStatus} onValueChange={(value) => updateParam("active", value)}>
              <SelectTrigger id="rc-filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("statusAll")}</SelectItem>
                <SelectItem value="true">{t("statusActive")}</SelectItem>
                <SelectItem value="false">{t("statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
          </ListFilterField>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={() => router.push(CATEGORIES_PATH)}>
              {tOps("filters.clear")}
            </Button>
          )}
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setFormItem({ item: null })}>
            <Plus aria-hidden />
            {t("createCategory")}
          </Button>
        )}
      </div>

      {showEmpty ? (
        <EmptyState
          icon={FolderOpen}
          variant={hasActiveFilters ? "no-results" : "default"}
          title={hasActiveFilters ? t("noResults") : t("emptyTitle")}
          description={hasActiveFilters ? t("noResultsDesc") : t("emptyDesc")}
        >
          {hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={() => router.push(CATEGORIES_PATH)}>
              {tOps("filters.clear")}
            </Button>
          ) : canCreate ? (
            <Button type="button" onClick={() => setFormItem({ item: null })}>
              <Plus aria-hidden />
              {t("createCategory")}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead className="max-md:hidden">{t("colDescription")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  {hasActions ? <RowActionsHead /> : <TableHead className="w-0 p-0" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadError ? (
                  <ErrorStateTableRow
                    colSpan={COLUMN_COUNT}
                    kind={loadError.kind}
                    retry
                    icon={FolderOpen}
                    detail={loadError.detail}
                  />
                ) : (
                  items.map((item, index) => {
                    const itemId = pickId(item);
                    const name = pickName(item);
                    const rowKey = itemId
                      ? `rc-${itemId}`
                      : `rc-row-${(safePage - 1) * safeLimit + index}`;
                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="max-w-[400px] whitespace-normal text-muted-foreground max-md:hidden">
                          {toText(item.description) ?? "—"}
                        </TableCell>
                        <TableCell>
                          <ExceptionStatus
                            value={item.active === false ? "inactive" : "active"}
                            normal={["active"]}
                            labels={statusLabels}
                            intents={{ inactive: "neutral" }}
                          />
                        </TableCell>
                        <TableCell>
                          {hasActions && (
                            <RowActions
                              label={name}
                              actions={[
                                {
                                  label: t("edit"),
                                  icon: Pencil,
                                  onSelect: () => setFormItem({ item }),
                                  hidden: !canEdit,
                                  disabled: !itemId,
                                },
                                {
                                  label: `${t("delete")}…`,
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () => setDeleteItem(item),
                                  hidden: !canDelete,
                                  disabled: !itemId,
                                },
                              ]}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTableShell>

          {!loadError && (
            <DataTablePagination
              page={safePage}
              totalPages={safeTotalPages}
              total={meta.total}
              limit={safeLimit}
              limitOptions={[10, 20, 50, 100]}
            />
          )}
        </>
      )}

      {formItem && (canCreate || canEdit) && (
        <CategoryFormDialog
          item={formItem.item}
          onClose={() => setFormItem(null)}
          onSaved={() => {
            setFormItem(null);
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
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDesc", { name: deleteItem ? pickName(deleteItem) : "" })}
        confirmLabel={t("delete")}
        onConfirm={async () => {
          const id = deleteItem ? pickId(deleteItem) : null;
          if (!id) return;
          await deleteResourceCategory(id);
          toast.success(tOps("categories.deleted"));
          router.refresh();
        }}
      />
    </div>
  );
}
