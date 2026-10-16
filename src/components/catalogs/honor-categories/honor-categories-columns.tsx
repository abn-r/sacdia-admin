"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
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
      header: () => <span className="sr-only">{labels.actions}</span>,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => {
        const category = row.original;

        return (
          <RowActions
            label={category.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(category),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(category),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
