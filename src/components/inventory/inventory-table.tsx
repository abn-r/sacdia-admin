"use client";

import { useState } from "react";
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
        title="Sin ítems de inventario"
        description="No se encontraron ítems para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nombre
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Descripción
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Categoría
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Cantidad
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-9 w-32 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const categoryName =
              item.inventory_category?.name ?? `Categoría ${item.inventory_category_id}`;

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
                  <Badge variant={item.active !== false ? "default" : "outline"}>
                    {item.active !== false ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleHistory(item)}
                      title="Ver historial"
                    >
                      <History className="size-3.5" />
                      <span className="sr-only">Historial</span>
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(item)}
                        title="Editar ítem"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(item)}
                        title="Eliminar ítem"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Eliminar</span>
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
