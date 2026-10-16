"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import type { AdminCountry } from "@/lib/catalogs/countries/types";

export type CountryColumnLabels = {
  name: string;
  abbreviation: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type CountryColumnsOptions = {
  labels: CountryColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (country: AdminCountry) => void;
  onDelete: (country: AdminCountry) => void;
};

export function getCountryColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: CountryColumnsOptions): ColumnDef<AdminCountry>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => `${row.name} ${row.abbreviation}`.toLowerCase(),
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
        const country = row.original;

        return (
          <RowActions
            label={country.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(country),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(country),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
