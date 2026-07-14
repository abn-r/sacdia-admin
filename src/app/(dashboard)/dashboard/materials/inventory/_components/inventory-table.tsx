"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { toneBadgeProps } from "@/components/materials/badge-tones";
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
  const t = useTranslations("materials.components.inventoryTable");
  const [editTarget, setEditTarget] = useState<MaterialProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialProduct | null>(null);

  const lfNameById = new Map<number, string>(
    localFields.map((lf) => [lf.local_field_id, lf.name]),
  );

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">SKU</TableHead>
              <TableHead>{t("colProduct")}</TableHead>
              {showLocalFieldColumn && <TableHead>{t("colLocalField")}</TableHead>}
              <TableHead>{t("colProgram")}</TableHead>
              <TableHead>{t("colCategory")}</TableHead>
              <TableHead className="text-right">{t("colPrice")}</TableHead>
              <TableHead className="text-right">{t("colStock")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="sticky right-0 z-20 w-[88px] border-l bg-background">
                {t("colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="pl-5">
                  <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                </TableCell>
                <TableCell>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {lfNameById.get(product.local_field_id) ??
                      `LF-${product.local_field_id}`}
                  </TableCell>
                )}

                {/* Programa */}
                <TableCell className="text-sm text-muted-foreground">
                  {product.programa?.label ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {product.cat?.label ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <MoneyFormat centavos={product.price_centavos} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      product.stock === 0 ? "text-destructive font-medium" : ""
                    }
                  >
                    {product.stock}
                  </span>
                </TableCell>

                {/* Estado */}
                <TableCell>
                  {product.active ? (
                    <Badge {...toneBadgeProps("success")}>{t("statusActive")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("statusInactive")}</Badge>
                  )}
                </TableCell>
                <TableCell className="sticky right-0 z-10 border-l bg-background">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("editAriaLabel")}
                      onClick={() => setEditTarget(product)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label={t("deactivateAriaLabel")}
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
