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

import { CountryFormDialog } from "@/components/catalogs/countries/country-form-dialog";
import { getCountryColumns } from "@/components/catalogs/countries/countries-columns";
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
import { deleteCountryAction } from "@/lib/catalogs/countries/actions";
import type { AdminCountry } from "@/lib/catalogs/countries/types";

type CountriesPageClientProps = {
  countries: AdminCountry[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function CountriesPageClient({
  countries,
  canCreate,
  canEdit,
  canDelete,
}: CountriesPageClientProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.countries.singular");
  const entityPlural = t("entities.countries.title").toLocaleLowerCase();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedCountry, setSelectedCountry] = React.useState<AdminCountry | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCountry | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      abbreviation: tFields("abbreviation"),
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
      getCountryColumns({
        labels: columnLabels,
        canEdit,
        canDelete,
        onEdit: (country) => {
          setSelectedCountry(country);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (country) => setDeleteTarget(country),
      }),
    [canDelete, canEdit, columnLabels],
  );

  const table = useReactTable({
    data: countries,
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
    const result = await deleteCountryAction(deleteTarget.country_id);
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
        title={t("entities.countries.title")}
        description={t("entities.countries.description")}
        breadcrumbs={[{ label: t("entities.countries.title") }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelectedCountry(null);
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

      <div className="flex flex-wrap gap-3">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t("filterBar.searchIn", { entity })}
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
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("filterBar.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterBar.statusAll")}</SelectItem>
            <SelectItem value="active">{t("filterBar.statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("filterBar.statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CatalogTableView table={table} entity={entity} entityPlural={entityPlural} />

      <CountryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        country={selectedCountry}
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
            <AlertDialogAction
              variant="destructive-solid"
              loading={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
