"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Pencil, Trash2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryHistoryDialog } from "@/components/inventory/inventory-history-dialog";
import type { InventoryItem } from "@/lib/api/inventory";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  const t = useTranslations("inventory");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  function handleHistory(item: InventoryItem) {
    setHistoryItem(item);
    setHistoryOpen(true);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("table.empty_title")}
        description={t("table.empty_description")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 w-[22%] px-3 text-xs font-medium text-muted-foreground">
              {t("table.col_name")}
            </TableHead>
            <TableHead className="h-9 w-[28%] px-3 text-xs font-medium text-muted-foreground">
              {t("table.col_description")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("table.col_category")}
            </TableHead>
            <TableHead className="h-9 px-3 text-center text-xs font-medium text-muted-foreground">
              {t("table.col_amount")}
            </TableHead>
            <TableHead className="h-9 px-3 text-center text-xs font-medium text-muted-foreground">
              {t("table.col_status")}
            </TableHead>
            <RowActionsHead className="h-9 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const categoryName =
              item.inventory_category?.name ??
              t("table.category_fallback", { id: item.inventory_category_id });

            return (
              <TableRow key={item.inventory_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="block truncate font-medium" title={item.name}>
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden px-3 py-2.5 align-middle">
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    title={item.description ?? undefined}
                  >
                    {item.description ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant="secondary">{categoryName}</Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center align-middle tabular-nums font-medium">
                  {item.amount}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center align-middle">
                  <StatusBadge intent={flagStatusIntent(item.active !== false)} label={item.active !== false ? t("status.active") : t("status.inactive")} />
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <RowActions
                    label={item.name}
                    actions={[
                      {
                        label: t("actions.view_history"),
                        icon: History,
                        onSelect: () => handleHistory(item),
                      },
                      {
                        label: t("actions.edit_item"),
                        icon: Pencil,
                        onSelect: () => onEdit?.(item),
                        hidden: !onEdit,
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <InventoryHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        inventoryId={historyItem?.inventory_id ?? null}
        itemName={historyItem?.name}
      />
    </div>
  );
}
