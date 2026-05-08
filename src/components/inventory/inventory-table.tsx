"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Pencil, Trash2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.col_name")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.col_description")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.col_category")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              {t("table.col_amount")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.col_status")}
            </TableHead>
            <TableHead className="h-9 w-32 px-3" />
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
                  <span className="font-medium">{item.name}</span>
                </TableCell>
                <TableCell className="max-w-[200px] px-3 py-2.5 align-middle">
                  <span className="truncate text-sm text-muted-foreground">
                    {item.description ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant="secondary">{categoryName}</Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums font-medium">
                  {item.amount}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant={item.active !== false ? "soft-success" : "outline"}>
                    {item.active !== false ? t("status.active") : t("status.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleHistory(item)}
                      title={t("actions.view_history")}
                    >
                      <History className="size-3.5" />
                      <span className="sr-only">{t("actions.history_sr")}</span>
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(item)}
                        title={t("actions.edit_item")}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">{t("actions.edit_sr")}</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(item)}
                        title={t("actions.delete_item")}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">{t("actions.delete_sr")}</span>
                      </Button>
                    )}
                  </div>
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
