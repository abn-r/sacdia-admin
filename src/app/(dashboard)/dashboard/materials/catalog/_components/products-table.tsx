"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { MoneyFormat } from "@/components/materials/money-format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { deleteProduct } from "@/lib/api/materials";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import type { LocalFieldOption, MaterialProduct } from "@/lib/types/materials";

interface ProductsTableProps {
  products: MaterialProduct[];
  /** Extra column with the product's local field (admins who can pick one). */
  showLocalFieldColumn?: boolean;
  localFields?: LocalFieldOption[];
  /** Hides edit / deactivate when the actor lacks the manage permission. */
  canManage: boolean;
}

export function ProductsTable({ products, showLocalFieldColumn = false, localFields = [], canManage }: ProductsTableProps) {
  const t = useTranslations("materials.components.inventoryTable");
  const tm = useTranslations("ops.materials.catalog");
  const router = useRouter();
  const [target, setTarget] = useState<MaterialProduct | null>(null);

  const lfNameById = new Map<number, string>(localFields.map((lf) => [lf.local_field_id, lf.name]));
  const activeLabels = { active: t("statusActive"), inactive: t("statusInactive") };

  async function confirmDeactivate() {
    if (!target) return;
    try {
      await deleteProduct(target.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) throw new Error(tm("deactivateProduct.openOrders"));
      throw new Error(err instanceof ApiError && err.message ? err.message : tm("deactivateProduct.error"));
    }
    toast.success(tm("deactivateProduct.done"));
    router.refresh();
  }

  const actionsFor = (product: MaterialProduct) => [
    {
      label: t("editAriaLabel"),
      icon: Pencil,
      href: `${MATERIALS_CATALOG_HREF}/${product.id}/edit`,
      hidden: !canManage,
    },
    {
      label: `${tm("deactivate")}…`,
      icon: Trash2,
      destructive: true,
      hidden: !canManage || !product.active,
      onSelect: () => setTarget(product),
    },
  ];

  const stock = (product: MaterialProduct) =>
    product.stock === 0 ? (
      <StatusBadge intent="destructive" label={tm("soldOut")} />
    ) : (
      <span className="tabular-nums">{product.stock}</span>
    );

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t("colProduct")}</TableHead>
              {showLocalFieldColumn ? <TableHead className="hidden xl:table-cell">{t("colLocalField")}</TableHead> : null}
              <TableHead className="hidden xl:table-cell">{t("colProgram")}</TableHead>
              <TableHead>{t("colCategory")}</TableHead>
              <TableHead className="text-right">{t("colPrice")}</TableHead>
              <TableHead className="text-right">{t("colStock")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <RowActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="pl-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.title}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                </TableCell>
                {showLocalFieldColumn ? (
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                    {lfNameById.get(product.local_field_id) ?? `LF-${product.local_field_id}`}
                  </TableCell>
                ) : null}
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {product.programa?.label ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{product.cat?.label ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <MoneyFormat centavos={product.price_centavos} />
                </TableCell>
                <TableCell className="text-right">{stock(product)}</TableCell>
                <TableCell>
                  <ExceptionStatus
                    value={product.active ? "active" : "inactive"}
                    normal={["active"]}
                    labels={activeLabels}
                    intents={{ inactive: "neutral" }}
                  />
                </TableCell>
                <TableCell>
                  <RowActions label={product.title} actions={actionsFor(product)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex items-start gap-2 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">{product.title}</p>
                {stock(product)}
              </div>
              <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                <span className="font-mono">{product.sku}</span>
                <span>{product.cat?.label ?? "—"}</span>
                <MoneyFormat centavos={product.price_centavos} />
                <ExceptionStatus
                  value={product.active ? "active" : "inactive"}
                  normal={["active"]}
                  labels={activeLabels}
                  intents={{ inactive: "neutral" }}
                />
              </p>
            </div>
            <RowActions label={product.title} actions={actionsFor(product)} />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        tone="destructive"
        title={tm("deactivateProduct.title", { name: target?.title ?? "" })}
        description={tm("deactivateProduct.description")}
        confirmLabel={tm("deactivate")}
        onConfirm={confirmDeactivate}
      />
    </>
  );
}
