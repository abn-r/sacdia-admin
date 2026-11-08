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

import { ClubIdealFormDialog } from "@/components/catalogs/club-ideals/club-ideal-form-dialog";
import { getClubIdealColumns } from "@/components/catalogs/club-ideals/club-ideals-columns";
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
import { deleteClubIdealAction } from "@/lib/catalogs/club-ideals/actions";
import { sortClubTypesForDisplay } from "@/lib/catalogs/club-ideals/sort";
import type { AdminClubIdealRow } from "@/lib/catalogs/club-ideals/types";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

type ClubIdealsPageClientProps = {
  clubIdeals: AdminClubIdealRow[];
  clubTypes: AdminClubType[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function ClubIdealsPageClient({
  clubIdeals,
  clubTypes,
  canCreate,
  canEdit,
  canDelete,
}: ClubIdealsPageClientProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.club-ideals.singular");
  const entityPlural = t("entities.club-ideals.title").toLocaleLowerCase();

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "club_type_id", desc: false },
    { id: "ideal_order", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [selectedClubIdeal, setSelectedClubIdeal] = React.useState<AdminClubIdealRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminClubIdealRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columnLabels = React.useMemo(
    () => ({
      name: tFields("name"),
      clubType: tFields("club_type"),
      idealOrder: tFields("ideal_order"),
      status: t("crudPage.colStatus"),
      actions: t("crudPage.colActions"),
      active: t("crudPage.statusActive"),
      inactive: t("crudPage.statusInactive"),
      edit: t("crudPage.edit"),
      delete: t("crudPage.delete"),
    }),
    [t, tFields],
  );

  const orderedClubTypes = React.useMemo(
    () => sortClubTypesForDisplay(clubTypes),
    [clubTypes],
  );

  const columns = React.useMemo(
    () =>
      getClubIdealColumns({
        labels: columnLabels,
        clubTypes: orderedClubTypes,
        canEdit,
        canDelete,
        onEdit: (clubIdeal) => {
          setSelectedClubIdeal(clubIdeal);
          setFormMode("edit");
          setFormOpen(true);
        },
        onDelete: (clubIdeal) => setDeleteTarget(clubIdeal),
      }),
    [canDelete, canEdit, columnLabels, orderedClubTypes],
  );

  const table = useReactTable({
    data: clubIdeals,
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
      columnVisibility: { search: false, club_type_id: false },
    },
  });

  const searchValue = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter =
    (table.getColumn("active")?.getFilterValue() as string | undefined) ?? "all";
  const clubTypeFilter =
    (table.getColumn("club_type_id")?.getFilterValue() as string | undefined) ?? "all";

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteClubIdealAction(deleteTarget.club_ideal_id);
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
        title={t("entities.club-ideals.title")}
        description={t("entities.club-ideals.description")}
        breadcrumbs={[{ label: t("entities.club-ideals.title") }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelectedClubIdeal(null);
                setFormMode("create");
                setFormOpen(true);
              }}
              disabled={clubTypes.length === 0}
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
          value={clubTypeFilter}
          onValueChange={(value) => {
            table.getColumn("club_type_id")?.setFilterValue(value);
            table.setPageIndex(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={tFields("club_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterBar.clubTypeAll")}</SelectItem>
            {orderedClubTypes.map((clubType) => (
              <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                {clubType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <ClubIdealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        clubIdeal={selectedClubIdeal}
        clubTypes={clubTypes}
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
