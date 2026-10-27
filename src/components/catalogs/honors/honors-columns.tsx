"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { RowActions } from "@/components/shared/row-actions";
import { CatalogThumbnail } from "@/components/shared/catalog-thumbnail";
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
      meta: { className: "min-w-[220px] max-w-[320px] whitespace-normal" },
      cell: ({ row }) => {
        const honor = row.original;

        return (
          <div className="flex items-center gap-3">
            <CatalogThumbnail src={honor.honor_image} size={40} />
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
      meta: { className: "hidden xl:table-cell" },
    },
    {
      accessorKey: "skill_level",
      header: () => labels.skillLevel,
      meta: { className: "hidden xl:table-cell" },
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
        const honor = row.original;

        return (
          <RowActions
            label={honor.name}
            actions={[
              {
                label: labels.edit,
                icon: Pencil,
                onSelect: () => onEdit(honor),
                hidden: !canEdit,
              },
              {
                label: `${labels.delete}…`,
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(honor),
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];
}
