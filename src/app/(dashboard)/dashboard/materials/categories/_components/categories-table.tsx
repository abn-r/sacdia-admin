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
import { CategoryFormSheet } from "./category-form-sheet";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

interface CategoriesTableProps {
  categorias: MaterialCategoryAdmin[];
}

export function CategoriesTable({ categorias }: CategoriesTableProps) {
  const [editTarget, setEditTarget] = useState<MaterialCategoryAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCategoryAdmin | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Slug
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nombre
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ícono
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                Orden
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                Productos
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 w-24 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((cat) => (
              <TableRow key={cat.id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm font-medium">
                  {cat.label}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {cat.icon ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums text-sm">
                  {cat.sort_order}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums text-sm">
                  {cat.product_count}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant={cat.active ? "success" : "secondary"}>
                    {cat.active ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar"
                      onClick={() => setEditTarget(cat)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Eliminar"
                      onClick={() => setDeleteTarget(cat)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
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
