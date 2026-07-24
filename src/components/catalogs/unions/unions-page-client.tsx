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

import { UnionFormDialog } from "@/components/catalogs/unions/union-form-dialog";
import { getUnionColumns } from "@/components/catalogs/unions/unions-columns";
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
import type { AdminCountry } from "@/lib/catalogs/countries/types";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";
import { deleteUnionAction } from "@/lib/catalogs/unions/actions";
import type { AdminUnionRow } from "@/lib/catalogs/unions/types";

type UnionsPageClientProps = {
  unions: AdminUnionRow[];
  countries: AdminCountry[];
  divisions: AdminDivision[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function UnionsPageClient({
  unions,
  countries,
  divisions,
  canCreate,
  canEdit,
  canDelete,
}: UnionsPageClientProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.unions.singular");

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedUnion, setSelectedUnion] = React.useState<AdminUnionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUnionRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      abbreviation: tFields("abbreviation"),
      country: tFields("country"),
      division: t("entities.divisions.title"),
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
      getUnionColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (union) => {
          setSelectedUnion(union);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (union) => setDeleteTarget(union),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: unions,
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
    const result = await deleteUnionAction(deleteTarget.union_id);
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
        title={t("entities.unions.title")}
        description={t("entities.unions.description")}
        breadcrumbs={[{ label: t("entities.unions.title") }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelectedUnion(null);
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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

      <UnionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        union={selectedUnion}
        countries={countries}
        divisions={divisions}
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
