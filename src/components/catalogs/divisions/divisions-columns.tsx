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
        const division = row.original;

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
                <DropdownMenuItem onClick={() => onEdit(division)}>
                  <Pencil className="size-4" />
                  {labels.edit}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(division)}>
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
