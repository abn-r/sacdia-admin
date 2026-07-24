"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminDistrictRow } from "@/lib/catalogs/districts/types";

export type DistrictColumnLabels = {
  name: string;
  localField: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type DistrictColumnsOptions = {
  labels: DistrictColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (district: AdminDistrictRow) => void;
  onDelete: (district: AdminDistrictRow) => void;
};

export function getDistrictColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: DistrictColumnsOptions): ColumnDef<AdminDistrictRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) => `${row.name} ${row.local_field_name}`.toLowerCase(),
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
      accessorKey: "local_field_name",
      header: () => labels.localField,
    },
    {
      accessorKey: "active",
      header: () => labels.status,
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? labels.active : labels.inactive}
        </Badge>
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
        const district = row.original;

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
                <DropdownMenuItem onClick={() => onEdit(district)}>
                  <Pencil className="size-4" />
                  {labels.edit}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(district)}>
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
