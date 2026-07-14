"use client";

import * as React from "react";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { HonorFormDialog } from "@/components/catalogs/honors/honor-form-dialog";
import { getHonorColumns } from "@/components/catalogs/honors/honors-columns";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminClubType } from "@/lib/api/admin-club-types";
import { deleteHonorAction } from "@/lib/catalogs/honors/actions";
import type { AdminHonorCategoryRow } from "@/lib/catalogs/honor-categories/types";
import type { AdminHonorRow } from "@/lib/catalogs/honors/types";

type HonorsPageClientProps = {
  honors: AdminHonorRow[];
  categories: AdminHonorCategoryRow[];
  clubTypes: AdminClubType[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function HonorsPageClient({
  honors,
  categories,
  clubTypes,
  canCreate,
  canEdit,
  canDelete,
}: HonorsPageClientProps) {
  const t = useTranslations("catalogs.entities.honors");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const tHonorCat = useTranslations("catalogs.honorCategories");
  const entity = t("singular");

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedHonor, setSelectedHonor] = React.useState<AdminHonorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminHonorRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      category: tHonorCat("colCategory"),
      clubType: tFields("club_type"),
      skillLevel: tFields("skill_level"),
      formatSkillLevel: (level: number) =>
        tFields("skill_level_format", { level: String(level) }),
      status: tCatalogs("crudPage.colStatus"),
      actions: tCatalogs("crudPage.colActions"),
      active: tCatalogs("crudPage.statusActive"),
      inactive: tCatalogs("crudPage.statusInactive"),
      edit: tCatalogs("crudPage.edit"),
      delete: tCatalogs("crudPage.delete"),
    }),
    [tCatalogs, tFields, tHonorCat],
  );

  const columns = React.useMemo(
    () =>
      getHonorColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (honor) => {
          setSelectedHonor(honor);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (honor) => setDeleteTarget(honor),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: honors,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      columnVisibility: { search: false },
    },
  });

  const searchValue = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter =
    (table.getColumn("active")?.getFilterValue() as string | undefined) ?? "all";

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteHonorAction(deleteTarget.honor_id);
    setDeleting(false);

    if (result.ok) {
      toast.success(tCatalogs("success.op_delete_title"), {
        description: tCatalogs("success.op_delete_description"),
      });
      setDeleteTarget(null);
      return;
    }

    toast.error(result.error ?? tCatalogs("errors.op_delete_failed"));
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: t("title") }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelectedHonor(null);
                setFormMode("create");
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {tCatalogs("actions.create", { entity })}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <CardTitle className="text-base">{tCatalogs("crudPage.listOf", { entity })}</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <InputGroup className="lg:max-w-sm">
              <InputGroupAddon>
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchValue}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder={tCatalogs("filterBar.searchPlaceholder", { entity })}
              />
            </InputGroup>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                table.getColumn("active")?.setFilterValue(value);
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder={tCatalogs("filterBar.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCatalogs("filterBar.statusAll")}</SelectItem>
                <SelectItem value="active">{tCatalogs("filterBar.statusActive")}</SelectItem>
                <SelectItem value="inactive">{tCatalogs("filterBar.statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) =>
                    header.column.id === "search" ? null : (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ),
                  )}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) =>
                      cell.column.id === "search" ? null : (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {searchValue || statusFilter !== "all"
                      ? tCatalogs("crudPage.noResultsDesc", { entity })
                      : tCatalogs("crudPage.noRecords")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t px-4 py-3 text-muted-foreground text-sm">
            <span>
              {table.getFilteredRowModel().rows.length} {tCatalogs("filterBar.records")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <HonorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        honor={selectedHonor}
        categories={categories}
        clubTypes={clubTypes}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tCatalogs("deleteDialog.title", { name: deleteTarget?.name ?? entity })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tCatalogs("deleteDialog.description", { name: deleteTarget?.name ?? entity })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {tCatalogs("deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? tCatalogs("deleteDialog.deleting") : tCatalogs("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
