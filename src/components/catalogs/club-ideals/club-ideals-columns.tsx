"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminClubIdealRow } from "@/lib/catalogs/club-ideals/types";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import { getClubTypeSortIndex } from "@/lib/catalogs/club-ideals/sort";

export type ClubIdealColumnLabels = {
  name: string;
  clubType: string;
  idealOrder: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type ClubIdealColumnsOptions = {
  labels: ClubIdealColumnLabels;
  clubTypes: AdminClubType[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (clubIdeal: AdminClubIdealRow) => void;
  onDelete: (clubIdeal: AdminClubIdealRow) => void;
};

export function getClubIdealColumns({
  labels,
  clubTypes,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ClubIdealColumnsOptions): ColumnDef<AdminClubIdealRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) =>
        `${row.name} ${row.club_type_name} ${row.ideal ?? ""}`.toLowerCase(),
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
      accessorKey: "club_type_id",
      enableHiding: false,
      sortingFn: (rowA, rowB) =>
        getClubTypeSortIndex(
          rowA.original.club_type_id,
          rowA.original.club_type_name,
          clubTypes,
        ) -
        getClubTypeSortIndex(
          rowB.original.club_type_id,
          rowB.original.club_type_name,
          clubTypes,
        ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        return String(row.original.club_type_id) === filterValue;
      },
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: "club_type_name",
      header: () => labels.clubType,
    },
    {
      accessorKey: "ideal_order",
      header: () => labels.idealOrder,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{row.original.ideal_order}</span>
      ),
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
        const clubIdeal = row.original;

        return (
          <RowActions
            label={clubIdeal.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(clubIdeal),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(clubIdeal),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
