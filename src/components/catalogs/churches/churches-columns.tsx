"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminChurchRow } from "@/lib/catalogs/churches/types";

export type ChurchColumnLabels = {
  name: string;
  district: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type ChurchColumnsOptions = {
  labels: ChurchColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (church: AdminChurchRow) => void;
  onDelete: (church: AdminChurchRow) => void;
};

export function getChurchColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ChurchColumnsOptions): ColumnDef<AdminChurchRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => `${row.name} ${row.district_name}`.toLowerCase(),
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
      accessorKey: "district_name",
      header: () => labels.district,
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
        const church = row.original;

        return (
          <RowActions
            label={church.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(church),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(church),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
