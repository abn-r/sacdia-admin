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

import { ChurchFormDialog } from "@/components/catalogs/churches/church-form-dialog";
import { getChurchColumns } from "@/components/catalogs/churches/churches-columns";
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
import { deleteChurchAction } from "@/lib/catalogs/churches/actions";
import type { AdminChurchRow } from "@/lib/catalogs/churches/types";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";

type ChurchesPageClientProps = {
  churches: AdminChurchRow[];
  districts: AdminDistrict[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function ChurchesPageClient({
  churches,
  districts,
  canCreate,
  canEdit,
  canDelete,
}: ChurchesPageClientProps) {
  const t = useTranslations("catalogs.entities.churches");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");
  const entityPlural = t("title").toLocaleLowerCase();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedChurch, setSelectedChurch] = React.useState<AdminChurchRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminChurchRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      district: tFields("district"),
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
      getChurchColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (church) => {
          setSelectedChurch(church);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (church) => setDeleteTarget(church),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: churches,
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
    const result = await deleteChurchAction(deleteTarget.church_id);
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
                setSelectedChurch(null);
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

      <ChurchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        church={selectedChurch}
        districts={districts}
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
