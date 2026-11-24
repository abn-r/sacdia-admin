"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventorySheet, type InventorySheetTab } from "@/components/inventory/inventory-sheet";
import { DeleteInventoryDialog } from "@/components/inventory/delete-inventory-dialog";
import type { InventoryCategory, InventoryItem } from "@/lib/api/inventory";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { filterInventoryItems, type InventoryStatusFilter } from "@/lib/inventory/filter-items";
import { Package } from "lucide-react";

const DEFAULT_PAGE_SIZE = 20;
const ALL = "all";

interface InventoryViewProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  /** `club` and `section` query values the row links carry. */
  contextQuery: string;
}

/**
 * Items of the chosen section. The club and section come from the context bar
 * above the title; here only category and status filter the list.
 */
export function InventoryView({ items, categories, contextQuery }: InventoryViewProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("ops.club.inventory");
  const router = useRouter();
  const { canCapability } = useScreenAccess();
  const canUpdate = canCapability("club-inventory", "update");
  const canDelete = canCapability("club-inventory", "delete");

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<InventoryStatusFilter>("active");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [openItem, setOpenItem] = useState<InventoryItem | null>(null);
  const [tab, setTab] = useState<InventorySheetTab>("detail");
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const filtered = useMemo(
    () => filterInventoryItems(items, { categoryId, status }),
    [items, categoryId, status],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * limit, current * limit);
  const isFiltered = categoryId !== null || status !== "active";

  function clearFilters() {
    setCategoryId(null);
    setStatus("active");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 max-sm:w-full">
          <Label htmlFor="inv-filter-category">{t("view.label_category")}</Label>
          <Select
            value={categoryId ? String(categoryId) : ALL}
            onValueChange={(value) => {
              setCategoryId(value === ALL ? null : Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger id="inv-filter-category" className="h-9 w-52 max-sm:w-full">
              <SelectValue placeholder={t("view.all_categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("view.all_categories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.inventory_category_id} value={String(category.inventory_category_id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 max-sm:w-full">
          <Label htmlFor="inv-filter-status">{t("table.col_status")}</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as InventoryStatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger id="inv-filter-status" className="h-9 w-44 max-sm:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{tc("status.active")}</SelectItem>
              <SelectItem value="inactive">{tc("status.inactive")}</SelectItem>
              <SelectItem value="all">{tc("status.all")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <InventoryTable
        items={visible}
        onOpen={(item, nextTab) => {
          setTab(nextTab);
          setOpenItem(item);
        }}
        editHref={
          canUpdate
            ? (item) => `/dashboard/inventory/${item.inventory_id}/edit?${contextQuery}`
            : undefined
        }
        onDelete={canDelete ? setDeleteItem : undefined}
        empty={
          isFiltered ? (
            <EmptyState variant="no-results" icon={Package} title={tc("noResults.title")} description={tc("noResults.description")}>
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                {tc("noResults.clear")}
              </Button>
            </EmptyState>
          ) : undefined
        }
      />

      {filtered.length > 0 ? (
        <DataTablePagination
          page={current}
          totalPages={totalPages}
          total={filtered.length}
          limit={limit}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      ) : null}

      <InventorySheet
        item={openItem}
        tab={tab}
        onTabChange={setTab}
        onOpenChange={(open) => {
          if (!open) setOpenItem(null);
        }}
      />

      <DeleteInventoryDialog
        open={deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        item={deleteItem}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
