"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

export type ClubTypeColumnLabels = {
  name: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type ClubTypeColumnsOptions = {
  labels: ClubTypeColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (clubType: AdminClubType) => void;
  onDelete: (clubType: AdminClubType) => void;
};

export function getClubTypeColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ClubTypeColumnsOptions): ColumnDef<AdminClubType>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => row.name.toLowerCase(),
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
        const clubType = row.original;

        return (
          <RowActions
            label={clubType.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(clubType),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(clubType),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
