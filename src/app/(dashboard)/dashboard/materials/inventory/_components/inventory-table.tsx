"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyFormat } from "@/components/materials/money-format";
import { ProductFormSheet } from "./product-form-sheet";
import { DeleteProductDialog } from "./delete-product-dialog";
import type {
  MaterialProduct,
  MaterialCategory,
  LocalFieldOption,
} from "@/lib/types/materials";

interface InventoryTableProps {
  products: MaterialProduct[];
  categories: MaterialCategory[];
  /** Render an extra column with the product's local_field (admins only). */
  showLocalFieldColumn?: boolean;
  /** Source for resolving local_field_id → name in the extra column. */
  localFields?: LocalFieldOption[];
}

export function InventoryTable({
  products,
  categories,
  showLocalFieldColumn = false,
  localFields = [],
}: InventoryTableProps) {
  const [editTarget, setEditTarget] = useState<MaterialProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialProduct | null>(null);

  const lfNameById = new Map<number, string>(
    localFields.map((lf) => [lf.local_field_id, lf.name]),
  );

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                SKU
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Producto
              </TableHead>
              {showLocalFieldColumn && (
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Campo local
                </TableHead>
              )}
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Programa
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categoría
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                Precio
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                Stock
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 w-24 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/30">
                {/* SKU */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="font-mono text-xs text-muted-foreground">
                    {product.sku}
                  </span>
                </TableCell>

                {/* Product name */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.title}</p>
                    {product.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Local field (admin merged view only) */}
                {showLocalFieldColumn && (
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {lfNameById.get(product.local_field_id) ??
                      `LF-${product.local_field_id}`}
                  </TableCell>
                )}

                {/* Programa */}
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {product.programa?.label ?? "—"}
                </TableCell>

                {/* Categoría */}
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {product.cat?.label ?? "—"}
                </TableCell>

                {/* Precio */}
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                  <MoneyFormat centavos={product.price_centavos} />
                </TableCell>

                {/* Stock */}
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                  <span
                    className={
                      product.stock === 0 ? "text-destructive font-medium" : ""
                    }
                  >
                    {product.stock}
                  </span>
                </TableCell>

                {/* Estado */}
                <TableCell className="px-3 py-2.5 align-middle">
                  {product.active ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>

                {/* Acciones */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar producto"
                      onClick={() => setEditTarget(product)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="Desactivar producto"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit sheet */}
      <ProductFormSheet
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        mode="edit"
        product={editTarget}
        categories={categories}
      />

      {/* Delete dialog */}
      <DeleteProductDialog
        product={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </>
  );
}
