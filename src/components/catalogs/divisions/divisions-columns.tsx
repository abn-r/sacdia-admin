"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";

export type DivisionColumnLabels = {
  code: string;
  name: string;
  abbreviation: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type DivisionColumnsOptions = {
  labels: DivisionColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (division: AdminDivision) => void;
  onDelete: (division: AdminDivision) => void;
};

export function getDivisionColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: DivisionColumnsOptions): ColumnDef<AdminDivision>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => `${row.code} ${row.name} ${row.abbreviation}`.toLowerCase(),
      enableHiding: false,
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: "code",
      header: () => labels.code,
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: () => labels.name,
    },
    {
      accessorKey: "abbreviation",
      header: () => labels.abbreviation,
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
        const division = row.original;

        return (
          <RowActions
            label={division.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(division),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(division),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
