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

import { ClubTypeFormDialog } from "@/components/catalogs/club-types/club-type-form-dialog";
import { getClubTypeColumns } from "@/components/catalogs/club-types/club-types-columns";
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
import { deleteClubTypeAction } from "@/lib/catalogs/club-types/actions";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

type ClubTypesPageClientProps = {
  clubTypes: AdminClubType[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function ClubTypesPageClient({
  clubTypes,
  canCreate,
  canEdit,
  canDelete,
}: ClubTypesPageClientProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.club-types.singular");

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedClubType, setSelectedClubType] = React.useState<AdminClubType | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminClubType | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      status: t("crudPage.colStatus"),
      actions: t("crudPage.colActions"),
      active: t("crudPage.statusActive"),
      inactive: t("crudPage.statusInactive"),
      edit: t("crudPage.edit"),
      delete: t("crudPage.delete"),
    }),
    [t, tFields],
  );

  const columns = React.useMemo(
    () =>
      getClubTypeColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (clubType) => {
          setSelectedClubType(clubType);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (clubType) => setDeleteTarget(clubType),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: clubTypes,
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
    const result = await deleteClubTypeAction(deleteTarget.club_type_id);
    setDeleting(false);

    if (result.ok) {
      toast.success(t("success.op_delete_title"), {
        description: t("success.op_delete_description"),
      });
      setDeleteTarget(null);
      return;
    }

    toast.error(result.error ?? t("errors.op_delete_failed"));
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title={t("entities.club-types.title")}
        description={t("entities.club-types.description")}
        breadcrumbs={[{ label: t("entities.club-types.title") }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelectedClubType(null);
                setFormMode("create");
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("actions.create", { entity })}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <CardTitle className="text-base">{t("crudPage.listOf", { entity })}</CardTitle>
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
                placeholder={t("filterBar.searchPlaceholder", { entity })}
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
                <SelectValue placeholder={t("filterBar.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterBar.statusAll")}</SelectItem>
                <SelectItem value="active">{t("filterBar.statusActive")}</SelectItem>
                <SelectItem value="inactive">{t("filterBar.statusInactive")}</SelectItem>
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
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    {searchValue || statusFilter !== "all"
                      ? t("crudPage.noResultsDesc", { entity })
                      : t("crudPage.noRecords")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t px-4 py-3 text-muted-foreground text-sm">
            <span>
              {table.getFilteredRowModel().rows.length} {t("filterBar.records")}
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

      <ClubTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        clubType={selectedClubType}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteDialog.title", { name: deleteTarget?.name ?? entity })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", { name: deleteTarget?.name ?? entity })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
