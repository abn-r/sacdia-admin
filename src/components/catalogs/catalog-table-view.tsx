"use client";

import * as React from "react";

import { flexRender, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import { Inbox, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActionsHead } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type CatalogTableViewProps<TData> = {
  table: TanstackTable<TData>;
  /** Singular entity name, used in the "no results" copy. */
  entity: string;
  /** Plural, lowercase entity name, used as the mobile list label. */
  entityPlural: string;
  /** Column ids that make up the identity (line 1, left) on mobile. Defaults to the first data column. */
  mobileTitleIds?: string[];
};

const NON_DATA_IDS = new Set(["search", "actions", "active"]);

/**
 * Shared list body for the client-side catalogs: table frame on desktop,
 * 2-line rows on mobile, empty states outside the table and the controlled
 * pagination footer wired to the TanStack table.
 */
export function CatalogTableView<TData>({
  table,
  entity,
  entityPlural,
  mobileTitleIds,
}: CatalogTableViewProps<TData>) {
  const t = useTranslations("catalogs");
  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;

  const isFiltered = table
    .getState()
    .columnFilters.some((filter) => filter.value && filter.value !== "all");

  if (rows.length === 0) {
    return isFiltered ? (
      <EmptyState
        variant="no-results"
        icon={Search}
        title={t("crudPage.noResults")}
        description={t("crudPage.noResultsDesc", { entity })}
      />
    ) : (
      <EmptyState icon={Inbox} title={t("crudPage.noRecords")} />
    );
  }

  const dataColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .filter((id) => !NON_DATA_IDS.has(id));
  const titleIds = mobileTitleIds ?? dataColumnIds.slice(0, 1);
  const detailIds = dataColumnIds.filter((id) => !titleIds.includes(id));

  function renderCell(row: Row<TData>, id: string) {
    const cell = row.getVisibleCells().find((item) => item.column.id === id);
    return cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden md:block">
        <DataTableShell>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.column.id === "search") {
                      return null;
                    }
                    if (header.column.id === "actions") {
                      return <RowActionsHead key={header.id} />;
                    }
                    return (
                      <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) =>
                    cell.column.id === "search" ? null : (
                      <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <ul className="md:hidden" aria-label={t("crudPage.listOf", { entity: entityPlural })}>
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-2 border-b py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-medium">
                  {titleIds.map((id) => (
                    <span key={id} className="min-w-0 break-words empty:hidden">
                      {renderCell(row, id)}
                    </span>
                  ))}
                </div>
                <div className="shrink-0">{renderCell(row, "active")}</div>
              </div>
              {detailIds.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                  {detailIds.map((id) => (
                    <span key={id} className="min-w-0 break-words tabular-nums empty:hidden">
                      {renderCell(row, id)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 -mr-1.5">{renderCell(row, "actions")}</div>
          </li>
        ))}
      </ul>

      <DataTablePagination
        page={pageIndex + 1}
        totalPages={Math.max(table.getPageCount(), 1)}
        total={total}
        limit={pageSize}
        limitOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(page) => table.setPageIndex(page - 1)}
        onPageSizeChange={(size) => table.setPageSize(size)}
      />
    </div>
  );
}
