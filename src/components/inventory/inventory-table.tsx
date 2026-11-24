"use client";

import { useTranslations } from "next-intl";
import { Eye, History, Package, Pencil, Trash2 } from "lucide-react";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { DataTableShell } from "@/components/shared/data-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryConditionMark } from "@/components/inventory/inventory-condition-mark";
import type { InventorySheetTab } from "@/components/inventory/inventory-sheet";
import type { InventoryItem } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";

interface InventoryTableProps {
  items: InventoryItem[];
  /** Opens the detail / history sheet. */
  onOpen: (item: InventoryItem, tab: InventorySheetTab) => void;
  /** Edit opens the route modal; the page that knows the section builds the href. */
  editHref?: (item: InventoryItem) => string;
  onDelete?: (item: InventoryItem) => void;
  /** Rendered instead of the empty state when the list has no items (e.g. filtered out). */
  empty?: React.ReactNode;
}

export function InventoryTable({ items, onOpen, editHref, onDelete, empty }: InventoryTableProps) {
  const t = useTranslations("inventory");

  if (items.length === 0) {
    return (
      empty ?? (
        <EmptyState
          icon={Package}
          title={t("table.empty_title")}
          description={t("table.empty_description")}
        />
      )
    );
  }

  const category = (item: InventoryItem) =>
    item.inventory_category?.name ??
    t("table.category_fallback", { id: item.inventory_category_id });

  const nameButton = (item: InventoryItem, className?: string) => (
    <button
      type="button"
      onClick={() => onOpen(item, "detail")}
      className={cn(
        "rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {item.name}
    </button>
  );

  const actions = (item: InventoryItem) => (
    <RowActions
      label={item.name}
      actions={[
        { label: t("actions.view_details"), icon: Eye, onSelect: () => onOpen(item, "detail") },
        { label: t("actions.view_history"), icon: History, onSelect: () => onOpen(item, "history") },
        {
          label: t("actions.edit_item"),
          icon: Pencil,
          href: editHref?.(item),
          hidden: !editHref,
        },
        {
          label: `${t("actions.delete_item")}…`,
          icon: Trash2,
          destructive: true,
          onSelect: () => onDelete?.(item),
          hidden: !onDelete,
        },
      ]}
    />
  );

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>{t("table.col_name")}</TableHead>
              <TableHead className={HEAD}>{t("table.col_category")}</TableHead>
              <TableHead className={HEAD}>
                <span className="sr-only">{t("table.col_condition")}</span>
              </TableHead>
              <TableHead className={cn(HEAD, "text-right")}>{t("table.col_amount")}</TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.inventory_id} className="hover:bg-muted/30">
                <TableCell className="max-w-sm whitespace-normal px-3 py-2.5 align-top">
                  {nameButton(item)}
                  {item.description ? (
                    <span className="block truncate text-[13px] text-muted-foreground" title={item.description}>
                      {item.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-top text-sm text-muted-foreground">
                  {category(item)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-top">
                  <InventoryConditionMark condition={item.condition} />
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right align-top text-sm font-medium tabular-nums">
                  {item.amount}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-top">{actions(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul className="divide-y" aria-label={t("table.col_name")}>
          {items.map((item) => (
            <li key={item.inventory_id} className="flex items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  {nameButton(item, "min-w-0 truncate text-sm")}
                  <span className="flex shrink-0 items-center gap-2">
                    <InventoryConditionMark condition={item.condition} />
                    <span className="text-sm font-medium tabular-nums">{item.amount}</span>
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{category(item)}</p>
              </div>
              {actions(item)}
            </li>
          ))}
        </ul>
      </DataTableShell>
    </>
  );
}
