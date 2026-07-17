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
import type { AdminHonorRow } from "@/lib/catalogs/honors/types";

export type HonorColumnLabels = {
  name: string;
  category: string;
  clubType: string;
  skillLevel: string;
  formatSkillLevel: (level: number) => string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  edit: string;
  delete: string;
};

type HonorColumnsOptions = {
  labels: HonorColumnLabels;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (honor: AdminHonorRow) => void;
  onDelete: (honor: AdminHonorRow) => void;
};

export function getHonorColumns({
  labels,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: HonorColumnsOptions): ColumnDef<AdminHonorRow>[] {
  return [
    {
      accessorKey: "search",
      accessorFn: (row) =>
        `${row.name} ${row.description ?? ""} ${row.honor_category_name} ${row.club_type_name}`.toLowerCase(),
      enableHiding: false,
      filterFn: "includesString",
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: "name",
      header: () => labels.name,
      cell: ({ row }) => {
        const honor = row.original;

        return (
          <div className="flex items-center gap-3">
            {honor.honor_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={honor.honor_image}
                alt=""
                className="max-h-10 max-w-10 shrink-0 object-contain"
              />
            ) : (
              <div
                className="size-10 shrink-0 rounded-md border bg-muted"
                aria-hidden="true"
              />
            )}
            <span className="font-medium">{honor.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "honor_category_name",
      header: () => labels.category,
      cell: ({ row }) => (
        <span>{row.original.honor_category_name || "—"}</span>
      ),
    },
    {
      accessorKey: "club_type_name",
      header: () => labels.clubType,
    },
    {
      accessorKey: "skill_level",
      header: () => labels.skillLevel,
      cell: ({ row }) => {
        const level = row.original.skill_level;
        if (level == null) return "—";
        return labels.formatSkillLevel(level);
      },
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
        const honor = row.original;

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
                <DropdownMenuItem onClick={() => onEdit(honor)}>
                  <Pencil className="size-4" />
                  {labels.edit}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(honor)}>
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
