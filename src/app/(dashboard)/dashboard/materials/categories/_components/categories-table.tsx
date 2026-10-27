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
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { CategoryFormSheet } from "./category-form-sheet";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

interface CategoriesTableProps {
  categorias: MaterialCategoryAdmin[];
}

export function CategoriesTable({ categorias }: CategoriesTableProps) {
  const t = useTranslations("materials.components.categoriesTable");
  const [editTarget, setEditTarget] = useState<MaterialCategoryAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCategoryAdmin | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                Slug
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                Nombre
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                Ícono
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground text-right">
                Orden
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground text-right">
                Productos
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                Estado
              </TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((cat) => (
              <TableRow key={cat.id} className="hover:bg-muted/30">
                <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle">
                  <span className="font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm font-medium">
                  {cat.label}
                </TableCell>
                <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {cat.icon ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums text-sm">
                  {cat.sort_order}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums text-sm">
                  {cat.product_count}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <StatusBadge intent={flagStatusIntent(cat.active)} label={cat.active ? t("statusActive") : t("statusInactive")} />
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <RowActions
                    label={cat.label}
                    actions={[
                      {
                        label: t("editAriaLabel"),
                        icon: Pencil,
                        onSelect: () => setEditTarget(cat),
                      },
                      {
                        label: `${t("deleteAriaLabel")}…`,
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => setDeleteTarget(cat),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CategoryFormSheet
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        mode="edit"
        categoria={editTarget}
      />

      <DeleteCategoryDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        categoria={deleteTarget}
      />
    </>
  );
}
