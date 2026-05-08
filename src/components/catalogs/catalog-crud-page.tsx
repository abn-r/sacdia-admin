"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { DataTableShell } from "@/components/shared/data-table-shell";

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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ─── Table column padding convention ─────────────────────────────────────────
// first col : pl-6 pr-4   — breathing room from card border
// middle col: px-4        — consistent gutters
// last col  : pl-4 pr-6   — mirror of first
const COL_FIRST = "pl-6 pr-4";
const COL_MID   = "px-4";
const COL_LAST  = "pl-4 pr-6";

// Header height + style shared by every <TableHead>
const TH_BASE = "h-11 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground align-middle";

// Row height — comfortable default; can be swapped to "h-10" for density
const ROW_H = "h-14";

// NoFilterResults removed — replaced by <EmptyState variant="no-results" />

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
}: CatalogCrudPageProps) {
  const tEntities = useTranslations("catalogs.entities");
  const tActions = useTranslations("catalogs.actions");
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

  const canMutate = config.allowMutations !== false;
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

  const editItemId = editItem ? getItemId(editItem) : null;
  const deleteItemId = deleteItem ? getItemId(deleteItem) : null;
  const hasFilters = searchQuery.trim() !== "" || activeFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
  };

  // ── Columns: first = ID, middle = data fields, last = actions (or status when read-only) ──
  // We need to know which column is truly "last" for the right-padding class.
  // Columns order: ID | ...displayFields | Estado | (Acciones if canMutate)
  const lastColIsActions = canMutate;

  return (
    <div className="space-y-6">
      {/* ── Page title row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{entityTitle}</h1>
            {!canMutate && <Badge variant="outline">{tCrud("readOnly")}</Badge>}
          </div>
          {entityDescription && (
            <p className="text-sm text-muted-foreground">{entityDescription}</p>
          )}
        </div>
        {canMutate && (
          <Button size="default" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {tActions("create", { entity: entitySingular })}
          </Button>
        )}
      </div>

      {/* ── Filter bar (only when there is data to filter) ── */}
      {items.length > 0 && (
        <CatalogFilterBar
          entityLabel={entityTitleLower}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={activeFilter}
          onStatusFilterChange={setActiveFilter}
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
          {canMutate && (
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
          icon={SearchX}
          title={tCrud("noResults")}
          description={tCrud("noResultsDesc", { entity: entityTitleLower })}
        >
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            {tCrud("clearFilters")}
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block">
            <DataTableShell>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      {/* ID — first column */}
                      <TableHead className={`${TH_BASE} ${COL_FIRST} w-[72px]`}>
                        ID
                      </TableHead>

                      {/* Data fields — middle columns */}
                      {displayFields.map((f) => (
                        <TableHead
                          key={f.name}
                          className={`${TH_BASE} ${COL_MID}`}
                        >
                          {tCatalogs(f.label)}
                        </TableHead>
                      ))}

                      {/* Estado — middle or last depending on canMutate */}
                      <TableHead
                        className={`${TH_BASE} ${lastColIsActions ? COL_MID : COL_LAST}`}
                      >
                        {tCrud("colStatus")}
                      </TableHead>

                      {/* Acciones — last column (only when mutations allowed) */}
                      {canMutate && (
                        <TableHead
                          className={`${TH_BASE} ${COL_LAST} w-[108px]`}
                        >
                          {tCrud("colActions")}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredItems.map((item, idx) => {
                      const itemId = getItemId(item);
                      const rowKey = itemId
                        ? `${config.key}-${itemId}`
                        : `${config.key}-row-${idx}`;

                      return (
                        <TableRow
                          key={rowKey}
                          className={`${ROW_H} border-b border-border transition-colors hover:bg-muted/30`}
                        >
                          {/* ID — first column */}
                          <TableCell
                            className={`${COL_FIRST} text-xs tabular-nums text-muted-foreground`}
                          >
                            {itemId ?? "—"}
                          </TableCell>

                          {/* Data fields — middle columns */}
                          {displayFields.map((f) => {
                            const val = item[f.name];
                            let display: string;

                            if (f.type === "select" && f.optionsEntityKey) {
                              const opts =
                                displaySelectOptions[f.optionsEntityKey] ??
                                selectOptions[f.optionsEntityKey] ??
                                [];
                              const match = opts.find((o) => o.value === Number(val));
                              display = match?.label ?? String(val ?? "—");
                            } else {
                              display = val != null ? String(val) : "—";
                            }

                            const isLongText = f.type === "textarea";

                            return (
                              <TableCell
                                key={f.name}
                                className={`${COL_MID} ${isLongText ? "max-w-[260px]" : ""}`}
                              >
                                {isLongText ? (
                                  <span
                                    className="block truncate text-sm text-muted-foreground"
                                    title={display}
                                  >
                                    {display}
                                  </span>
                                ) : (
                                  <span className="text-sm">{display}</span>
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Estado — middle or last */}
                          <TableCell
                            className={lastColIsActions ? COL_MID : COL_LAST}
                          >
                            <Badge
                              variant={item.active !== false ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {item.active !== false ? tCrud("statusActive") : tCrud("statusInactive")}
                            </Badge>
                          </TableCell>

                          {/* Acciones — last column */}
                          {canMutate && (
                            <TableCell className={COL_LAST}>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="hover:bg-muted"
                                  disabled={!itemId}
                                  onClick={() => setEditItem(item)}
                                  aria-label={tCrud("editRecord")}
                                >
                                  <Pencil className="size-3.5" aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:bg-muted hover:text-destructive"
                                  disabled={!itemId}
                                  onClick={() => setDeleteItem(item)}
                                  aria-label={tCrud("deleteRecord")}
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </DataTableShell>
          </div>

          {/* ── Mobile cards ── */}
          <ul
            className="space-y-3 md:hidden"
            aria-label={tCrud("listOf", { entity: entityTitleLower })}
          >
            {filteredItems.map((item, idx) => {
              const itemId = getItemId(item);
              const rowKey = itemId
                ? `${config.key}-${itemId}`
                : `${config.key}-row-${idx}`;

              // Primary display: first displayField value
              const primaryField = displayFields[0];
              const primaryVal = primaryField
                ? (() => {
                    const val = item[primaryField.name];
                    if (primaryField.type === "select" && primaryField.optionsEntityKey) {
                      const opts =
                        displaySelectOptions[primaryField.optionsEntityKey] ??
                        selectOptions[primaryField.optionsEntityKey] ??
                        [];
                      const match = opts.find((o) => o.value === Number(val));
                      return match?.label ?? String(val ?? "—");
                    }
                    return val != null ? String(val) : "—";
                  })()
                : "—";

              // Secondary fields: remaining displayFields (up to 2 shown as dl pairs)
              const secondaryFields = displayFields.slice(1, 3);

              return (
                <li key={rowKey}>
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none">
                    {/* Card header: icon + name + edit chevron */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{primaryVal}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          #{itemId ?? "—"}
                        </p>
                      </div>
                      {canMutate && itemId && (
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setEditItem(item)}
                          aria-label={tCrud("editItem", { item: primaryVal })}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.active !== false ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {item.active !== false ? tCrud("statusActive") : tCrud("statusInactive")}
                      </Badge>
                    </div>

                    {/* Secondary data fields */}
                    {secondaryFields.length > 0 && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {secondaryFields.map((f) => {
                          const val = item[f.name];
                          let display: string;
                          if (f.type === "select" && f.optionsEntityKey) {
                            const opts =
                              displaySelectOptions[f.optionsEntityKey] ??
                              selectOptions[f.optionsEntityKey] ??
                              [];
                            const match = opts.find((o) => o.value === Number(val));
                            display = match?.label ?? String(val ?? "—");
                          } else {
                            display = val != null ? String(val) : "—";
                          }
                          return (
                            <div key={f.name}>
                              <dt className="text-muted-foreground">
                                {tCatalogs(f.label)}
                              </dt>
                              <dd className="truncate">{display}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}

                    {/* Actions row */}
                    {canMutate && itemId && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setEditItem(item)}
                          aria-label={tCrud("editItem", { item: primaryVal })}
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                          {tCrud("edit")}
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteItem(item)}
                          aria-label={tCrud("deleteItem", { item: primaryVal })}
                        >
                          <Trash2 className="size-3" aria-hidden="true" />
                          {tCrud("delete")}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ── Dialogs ── */}
      {canMutate && (
        <CatalogFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={tActions("create", { entity: entitySingular })}
          fields={config.fields}
          selectOptions={selectOptions}
          formAction={createAction}
        />
      )}

      {canMutate && editItem && editItemId && (
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

      {canMutate && deleteItem && deleteItemId && (
        <CatalogDeleteDialog
          open={!!deleteItem}
          onOpenChange={(open) => {
            if (!open) setDeleteItem(null);
          }}
          entityKey={config.key}
          itemId={deleteItemId}
          itemName={String(deleteItem[config.nameField] ?? "registro")}
          returnPath={config.routeBase}
        />
      )}
    </div>
  );
}
