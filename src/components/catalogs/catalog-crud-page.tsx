"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CatalogFilterBar, type StatusFilter } from "@/components/catalogs/catalog-filter-bar";
import { CatalogFormDialog } from "@/components/catalogs/catalog-form-dialog";
import { CatalogDeleteDialog } from "@/components/catalogs/catalog-delete-dialog";
import type { EntityConfig, EntityKey } from "@/lib/catalogs/entities";
import type { CatalogItem } from "@/lib/catalogs/service";
import type { CatalogActionState } from "@/lib/catalogs/actions";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { PageHeader } from "@/components/shared/page-header";
import { usePanelPath } from "@/lib/v2/panel-path-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type SelectOption = { label: string; value: number };

type BoundAction = (prevState: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;
type UpdateActionBase = (
  entityKey: EntityKey,
  id: number | string,
  redirectTo: string,
  _: CatalogActionState,
  formData: FormData,
) => Promise<CatalogActionState>;

interface CatalogCrudPageProps {
  config: EntityConfig;
  items: CatalogItem[];
  selectOptions: Record<string, SelectOption[]>;
  displaySelectOptions?: Record<string, SelectOption[]>;
  createAction: BoundAction;
  updateActionBase: UpdateActionBase;
  entityKey: EntityKey;
  routeBase: string;
  hidePageHeader?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ─── CatalogCrudPage ──────────────────────────────────────────────────────────

export function CatalogCrudPage({
  config,
  items,
  selectOptions,
  displaySelectOptions = {},
  createAction,
  updateActionBase,
  entityKey,
  routeBase,
  hidePageHeader = false,
  canCreate,
  canEdit,
  canDelete,
}: CatalogCrudPageProps) {
  const tEntities = useTranslations("catalogs.entities");
  const tActions = useTranslations("catalogs.actions");
  const { toPanelPath } = usePanelPath();
  const resolvedRouteBase = toPanelPath(routeBase);
  const tCatalogs = useTranslations("catalogs");
  const tCrud = useTranslations("catalogs.crudPage");
  const entityTitle = tEntities(`${config.key}.title`);
  const entitySingular = tEntities(`${config.key}.singular`);
  const entityDescription = tEntities(`${config.key}.description`);
  const entityTitleLower = entityTitle.toLowerCase();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const mutationsEnabled = config.allowMutations !== false;
  const showCreate = canCreate ?? mutationsEnabled;
  const showEdit = canEdit ?? mutationsEnabled;
  const showDelete = canDelete ?? mutationsEnabled;
  const canMutate = showCreate || showEdit || showDelete;
  const displayFields = config.fields.filter((f) => f.type !== "checkbox");

  const getItemId = (item: CatalogItem): string | null => {
    const rawId = item[config.idField];
    if (rawId === null || rawId === undefined) return null;
    const normalized = String(rawId).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(searchQuery);
    return items.filter((item) => {
      if (activeFilter === "active" && item.active === false) return false;
      if (activeFilter === "inactive" && item.active !== false) return false;
      if (normalizedSearch) {
        const nameValue = String(item[config.nameField] ?? "");
        if (!normalizeText(nameValue).includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [items, searchQuery, activeFilter, config.nameField]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getDisplayValue = (item: CatalogItem, field: (typeof displayFields)[number]): string => {
    const val = item[field.name];
    if (field.type === "select" && field.optionsEntityKey) {
      const opts =
        displaySelectOptions[field.optionsEntityKey] ?? selectOptions[field.optionsEntityKey] ?? [];
      const match = opts.find((o) => o.value === Number(val));
      return match?.label ?? String(val ?? "—");
    }
    return val != null ? String(val) : "—";
  };

  const renderRowActions = (item: CatalogItem, itemId: string | null) => (
    <RowActions
      label={String(item[config.nameField] ?? itemId ?? "")}
      actions={[
        {
          label: tCrud("edit"),
          icon: Pencil,
          onSelect: () => setEditItem(item),
          hidden: !showEdit,
          disabled: !itemId,
        },
        {
          label: `${tCrud("delete")}…`,
          icon: Trash2,
          destructive: true,
          onSelect: () => setDeleteItem(item),
          hidden: !showDelete,
          disabled: !itemId,
        },
      ]}
    />
  );

  const editItemId = editItem ? getItemId(editItem) : null;
  const deleteItemId = deleteItem ? getItemId(deleteItem) : null;
  const hasFilters = searchQuery.trim() !== "" || activeFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setPage(1);
  };

  // Columns: ...displayFields | ID | Estado | (Acciones if the user can mutate)
  const lastColIsActions = showEdit || showDelete;

  return (
    <div className={hidePageHeader ? "space-y-4" : "space-y-6"}>
      {!hidePageHeader ? (
        <PageHeader
          title={entityTitle}
          description={entityDescription}
          actions={
            showCreate ? (
              <Button size="default" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                {tActions("create", { entity: entitySingular })}
              </Button>
            ) : !canMutate ? (
              <Badge variant="outline">{tCrud("readOnly")}</Badge>
            ) : undefined
          }
        />
      ) : null}

      {hidePageHeader && showCreate ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {tActions("create", { entity: entitySingular })}
          </Button>
        </div>
      ) : null}

      {/* ── Filter bar (only when there is data to filter) ── */}
      {items.length > 0 && (
        <CatalogFilterBar
          entityLabel={entityTitleLower}
          searchValue={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          statusFilter={activeFilter}
          onStatusFilterChange={(value) => {
            setActiveFilter(value);
            setPage(1);
          }}
          totalCount={items.length}
          filteredCount={filteredItems.length}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* ── Content area ── */}
      {items.length === 0 ? (
        /* No data at all */
        <EmptyState
          icon={Package}
          title={tActions("empty_state", { entity: entityTitleLower })}
          description={tCrud("noRecords")}
        >
          {showCreate && (
            <Button size="default" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              {tActions("create", { entity: entitySingular })}
            </Button>
          )}
        </EmptyState>
      ) : filteredItems.length === 0 ? (
        /* Data exists but filters return nothing */
        <EmptyState
          variant="no-results"
          icon={Search}
          title={tCrud("noResults")}
          description={tCrud("noResultsDesc", { entity: entityTitleLower })}
        >
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            {tCrud("clearFilters")}
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Desktop table ── */}
          <div className="hidden md:block">
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Data fields — identity (name) first */}
                    {displayFields.map((f) => (
                      <TableHead key={f.name}>
                        {tCatalogs(f.label as Parameters<typeof tCatalogs>[0])}
                      </TableHead>
                    ))}
                    <TableHead className="w-[72px] text-right">ID</TableHead>
                    <TableHead>{tCrud("colStatus")}</TableHead>
                    {lastColIsActions && <RowActionsHead />}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageItems.map((item, idx) => {
                    const itemId = getItemId(item);
                    const rowKey = itemId ? `${config.key}-${itemId}` : `${config.key}-row-${idx}`;

                    return (
                      <TableRow key={rowKey}>
                        {displayFields.map((f, fieldIndex) => {
                          const display = getDisplayValue(item, f);
                          const isLongText = f.type === "textarea";

                          return (
                            <TableCell key={f.name} className={isLongText ? "max-w-[260px]" : undefined}>
                              {isLongText ? (
                                <span className="block truncate text-sm text-muted-foreground" title={display}>
                                  {display}
                                </span>
                              ) : (
                                <span className={fieldIndex === 0 ? "text-sm font-medium" : "text-sm"}>
                                  {display}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {itemId ?? "—"}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            intent={flagStatusIntent(item.active !== false)}
                            label={item.active !== false ? tCrud("statusActive") : tCrud("statusInactive")}
                            size="sm"
                          />
                        </TableCell>

                        {lastColIsActions && (
                          <TableCell>{renderRowActions(item, itemId)}</TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </div>

          {/* ── Mobile: 2-line rows ── */}
          <ul className="md:hidden" aria-label={tCrud("listOf", { entity: entityTitleLower })}>
            {pageItems.map((item, idx) => {
              const itemId = getItemId(item);
              const rowKey = itemId ? `${config.key}-${itemId}` : `${config.key}-row-${idx}`;
              const primaryField = displayFields[0];
              const primaryVal = primaryField ? getDisplayValue(item, primaryField) : "—";
              const secondaryFields = displayFields.slice(1, 3);

              return (
                <li key={rowKey} className="flex items-start gap-2 border-b py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{primaryVal}</p>
                      <StatusBadge
                        intent={flagStatusIntent(item.active !== false)}
                        label={item.active !== false ? tCrud("statusActive") : tCrud("statusInactive")}
                        size="sm"
                      />
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                      <span className="tabular-nums">#{itemId ?? "—"}</span>
                      {secondaryFields.map((f) => (
                        <span key={f.name} className="min-w-0 break-words">
                          {getDisplayValue(item, f)}
                        </span>
                      ))}
                    </p>
                  </div>
                  {lastColIsActions && <div className="-mr-1.5 shrink-0">{renderRowActions(item, itemId)}</div>}
                </li>
              );
            })}
          </ul>

          <DataTablePagination
            page={currentPage}
            totalPages={totalPages}
            total={filteredItems.length}
            limit={pageSize}
            limitOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* ── Dialogs ── */}
      {showCreate && (
        <CatalogFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={tActions("create", { entity: entitySingular })}
          fields={config.fields}
          selectOptions={selectOptions}
          formAction={createAction}
        />
      )}

      {showEdit && editItem && editItemId && (
        <CatalogFormDialog
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          title={tActions("edit", { entity: entitySingular })}
          fields={config.fields}
          initialValues={editItem}
          selectOptions={selectOptions}
          formAction={updateActionBase.bind(null, entityKey, editItemId, routeBase)}
        />
      )}

      {showDelete && deleteItem && deleteItemId && (
        <CatalogDeleteDialog
          open={!!deleteItem}
          onOpenChange={(open) => {
            if (!open) setDeleteItem(null);
          }}
          entityKey={config.key}
          itemId={deleteItemId}
          itemName={String(deleteItem[config.nameField] ?? "registro")}
          returnPath={resolvedRouteBase}
        />
      )}
    </div>
  );
}
