"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminUnionRow } from "@/lib/catalogs/unions/types";

export type UnionColumnLabels = {
  name: string;
  abbreviation: string;
  country: string;
  division: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type UnionColumnsOptions = {
  labels: UnionColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (union: AdminUnionRow) => void;
  onDelete: (union: AdminUnionRow) => void;
};

export function getUnionColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: UnionColumnsOptions): ColumnDef<AdminUnionRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) =>
        `${row.name} ${row.abbreviation} ${row.country_name} ${row.division_name}`.toLowerCase(),
      enableHiding: false,
      filterFn: "includesString",
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: "name",
      header: () => labels.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "abbreviation",
      header: () => labels.abbreviation,
    },
    {
      accessorKey: "country_name",
      header: () => labels.country,
    },
    {
      accessorKey: "division_name",
      header: () => labels.division,
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
      meta: { className: "sticky right-0 z-10 w-12 bg-card text-right" },
      cell: ({ row }) => {
        const union = row.original;

        return (
          <RowActions
            label={union.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(union),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(union),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
