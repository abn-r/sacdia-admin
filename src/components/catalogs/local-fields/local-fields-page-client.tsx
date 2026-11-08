"use client";

import * as React from "react";

import {
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

import { LocalFieldFormDialog } from "@/components/catalogs/local-fields/local-field-form-dialog";
import { getLocalFieldColumns } from "@/components/catalogs/local-fields/local-fields-columns";
import { CatalogTableView } from "@/components/catalogs/catalog-table-view";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteLocalFieldAction } from "@/lib/catalogs/local-fields/actions";
import type { AdminLocalFieldRow } from "@/lib/catalogs/local-fields/types";
import type { AdminUnion } from "@/lib/catalogs/unions/types";

type LocalFieldsPageClientProps = {
  localFields: AdminLocalFieldRow[];
  unions: AdminUnion[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function LocalFieldsPageClient({
  localFields,
  unions,
  canCreate,
  canEdit,
  canDelete,
}: LocalFieldsPageClientProps) {
  const t = useTranslations("catalogs.entities.local-fields");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");
  const entityPlural = t("title").toLocaleLowerCase();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedLocalField, setSelectedLocalField] = React.useState<AdminLocalFieldRow | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<AdminLocalFieldRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      abbreviation: tFields("abbreviation"),
      union: tFields("union"),
      status: tCatalogs("crudPage.colStatus"),
      actions: tCatalogs("crudPage.colActions"),
      active: tCatalogs("crudPage.statusActive"),
      inactive: tCatalogs("crudPage.statusInactive"),
      edit: tCatalogs("crudPage.edit"),
      delete: tCatalogs("crudPage.delete"),
    }),
    [tCatalogs, tFields],
  );

  const columns = React.useMemo(
    () =>
      getLocalFieldColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (localField) => {
          setSelectedLocalField(localField);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (localField) => setDeleteTarget(localField),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: localFields,
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
    const result = await deleteLocalFieldAction(deleteTarget.local_field_id);
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
                setSelectedLocalField(null);
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

      <div className="flex flex-wrap gap-3">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={tCatalogs("filterBar.searchIn", { entity })}
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
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={tCatalogs("filterBar.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCatalogs("filterBar.statusAll")}</SelectItem>
            <SelectItem value="active">{tCatalogs("filterBar.statusActive")}</SelectItem>
            <SelectItem value="inactive">{tCatalogs("filterBar.statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CatalogTableView table={table} entity={entity} entityPlural={entityPlural} />

      <LocalFieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        localField={selectedLocalField}
        unions={unions}
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
            <AlertDialogAction
              variant="destructive-solid"
              loading={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? tCatalogs("deleteDialog.deleting") : tCatalogs("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
