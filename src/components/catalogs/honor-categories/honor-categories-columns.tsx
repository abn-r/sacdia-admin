"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminHonorCategoryRow } from "@/lib/catalogs/honor-categories/types";

export type HonorCategoryColumnLabels = {
  name: string;
  description: string;
  honorsCount: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type HonorCategoryColumnsOptions = {
  labels: HonorCategoryColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (category: AdminHonorCategoryRow) => void;
  onDelete: (category: AdminHonorCategoryRow) => void;
};

export function getHonorCategoryColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: HonorCategoryColumnsOptions): ColumnDef<AdminHonorCategoryRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => `${row.name} ${row.description ?? ""}`.toLowerCase(),
      enableHiding: false,
      filterFn: "includesString",
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: "name",
      header: () => labels.name,
      meta: { className: "max-w-[280px] whitespace-normal" },
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: () => labels.description,
      meta: { className: "min-w-[200px] max-w-[420px] whitespace-normal" },
      cell: ({ row }) => (
        <span className="line-clamp-2 text-muted-foreground text-sm">
          {row.original.description ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "honors_count",
      header: () => labels.honorsCount,
      cell: ({ row }) => row.original.honors_count,
    },
    {
      accessorKey: "active",
      header: () => labels.status,
      cell: ({ row }) => (
        <StatusBadge intent={flagStatusIntent(row.original.active)} label={row.original.active ? labels.active : labels.inactive} />
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        if (filterValue === "active") return row.original.active;
        if (filterValue === "inactive") return !row.original.active;
        return true;
      },
    },
    {
      id: "actions",
      header: () => labels.actions,
      cell: ({ row }) => {
        const category = row.original;

        if (!canEdit && !canDelete) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">{labels.actions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit ? (
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Pencil className="size-4" />
                  {labels.edit}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(category)}>
                  <Trash2 className="size-4" />
                  {labels.delete}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
