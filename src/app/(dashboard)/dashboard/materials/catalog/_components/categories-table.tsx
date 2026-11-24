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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { deleteCategory } from "@/lib/api/materials";
import { MATERIALS_CATEGORIES_HREF } from "@/lib/materials/routes";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

interface CategoriesTableProps {
  categorias: MaterialCategoryAdmin[];
  canManage: boolean;
}

export function CategoriesTable({ categorias, canManage }: CategoriesTableProps) {
  const t = useTranslations("materials.components.categoriesTable");
  const tm = useTranslations("ops.materials.catalog");
  const router = useRouter();
  const [target, setTarget] = useState<MaterialCategoryAdmin | null>(null);
  const activeLabels = { active: t("statusActive"), inactive: t("statusInactive") };

  async function confirmDeactivate() {
    if (!target) return;
    try {
      await deleteCategory(target.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) throw new Error(tm("deactivateCategory.hasProducts"));
      throw new Error(err instanceof ApiError && err.message ? err.message : tm("deactivateCategory.error"));
    }
    toast.success(tm("deactivateCategory.done"));
    router.refresh();
  }

  const actionsFor = (cat: MaterialCategoryAdmin) => [
    { label: t("editAriaLabel"), icon: Pencil, href: `${MATERIALS_CATEGORIES_HREF}/${cat.id}/edit`, hidden: !canManage },
    {
      label: `${tm("deactivate")}…`,
      icon: Trash2,
      destructive: true,
      hidden: !canManage || !cat.active,
      onSelect: () => setTarget(cat),
    },
  ];

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{tm("colName")}</TableHead>
              <TableHead className="text-right">{tm("colOrder")}</TableHead>
              <TableHead className="text-right">{tm("colProducts")}</TableHead>
              <TableHead>{tm("colStatus")}</TableHead>
              <RowActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="pl-5">
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{cat.slug}</p>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{cat.sort_order}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{cat.product_count}</TableCell>
                <TableCell>
                  <ExceptionStatus
                    value={cat.active ? "active" : "inactive"}
                    normal={["active"]}
                    labels={activeLabels}
                    intents={{ inactive: "neutral" }}
                  />
                </TableCell>
                <TableCell>
                  <RowActions label={cat.label} actions={actionsFor(cat)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {categorias.map((cat) => (
          <li key={cat.id} className="flex items-start gap-2 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">{cat.label}</p>
              <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                <span className="font-mono">{cat.slug}</span>
                <span>{tm("productCount", { count: cat.product_count })}</span>
                <ExceptionStatus
                  value={cat.active ? "active" : "inactive"}
                  normal={["active"]}
                  labels={activeLabels}
                  intents={{ inactive: "neutral" }}
                />
              </p>
            </div>
            <RowActions label={cat.label} actions={actionsFor(cat)} />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        tone="destructive"
        title={tm("deactivateCategory.title", { name: target?.label ?? "" })}
        description={tm("deactivateCategory.description")}
        confirmLabel={tm("deactivate")}
        onConfirm={confirmDeactivate}
      />
    </>
  );
}
