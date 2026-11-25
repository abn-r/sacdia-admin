"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Tent } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState, ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { CamporeeDeleteConfirm } from "@/components/camporees/camporee-delete-confirm";
import { formatCalendarDateRange } from "@/lib/format-locale";
import type { LoadFailure } from "@/lib/camporees/detail-data";
import {
  filterCamporeeRows,
  type CamporeeListRow,
  type CamporeeRangeFilter,
  type CamporeeRegistrationState,
} from "@/lib/camporees/list";
import { camporeeBasePath } from "@/lib/camporees/groups";
import type { CamporeeKind } from "@/lib/camporees/normalize";

export interface CamporeesListProps {
  kind: CamporeeKind;
  rows: CamporeeListRow[];
  /** The list failed to load: shown inside the table frame, never as an empty list. */
  failure: LoadFailure | null;
  pagination: { page: number; totalPages: number; total: number; limit: number };
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** `YYYY-MM-DD` computed on the server so server and client agree on "today". */
  today: string;
}

const RANGE_VALUES: CamporeeRangeFilter[] = ["upcoming", "past", "all"];

export function CamporeesList({
  kind,
  rows,
  failure,
  pagination,
  canCreate,
  canEdit,
  canDelete,
  today,
}: CamporeesListProps) {
  const t = useTranslations("evaluation.camporees.list");
  const tc = useTranslations("camporees");
  const tDetail = useTranslations("camporees.pages.detail");
  const locale = useLocale();
  const searchId = useId();
  const rangeId = useId();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<CamporeeRangeFilter>("upcoming");
  const [deleting, setDeleting] = useState<CamporeeListRow | null>(null);

  const visible = useMemo(
    () => filterCamporeeRows(rows, { query, range, today }),
    [rows, query, range, today],
  );
  const filtered = query.trim() !== "" || range !== "all";
  const colSpan = 6;
  const registrationLabels: Record<CamporeeRegistrationState, string> = {
    open: t("registration.open"),
    closed: t("registration.closed"),
    inactive: tc("list.statusInactive"),
  };
  const rangeLabels: Record<CamporeeRangeFilter, string> = {
    upcoming: t("rangeUpcoming"),
    past: t("rangePast"),
    all: t("rangeAll"),
  };
  const ownerHeading = kind === "union" ? tc("unionList.colUnion") : tDetail("labelLocalFieldKpi");

  function clearFilters() {
    setQuery("");
    setRange("all");
  }

  function actionsFor(row: CamporeeListRow) {
    const base = camporeeBasePath(row.kind, row.id);
    return [
      { label: tc("list.viewDetail"), icon: Eye, href: base },
      {
        label: tc("unionList.editLabel"),
        icon: Pencil,
        href: `${base}/edit`,
        hidden: !canEdit,
      },
      {
        label: `${tc("list.deleteLabel")}…`,
        icon: Trash2,
        destructive: true,
        hidden: !canDelete,
        onSelect: () => setDeleting(row),
      },
    ];
  }

  const showTable = failure !== null || visible.length > 0;

  return (
    <div className="space-y-4">
      {!failure && rows.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full space-y-1.5 sm:w-64">
            <Label htmlFor={searchId}>{t("searchLabel")}</Label>
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-52">
            <Label htmlFor={rangeId}>{t("rangeLabel")}</Label>
            <Select value={range} onValueChange={(v) => setRange(v as CamporeeRangeFilter)}>
              <SelectTrigger id={rangeId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {rangeLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered && pagination.totalPages > 1 && (
            <p className="pb-2 text-xs text-muted-foreground">{t("onlyThisPage")}</p>
          )}
        </div>
      )}

      {showTable && (
        <DataTableShell className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("colName")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("colDates")}
                </TableHead>
                <TableHead className="hidden h-9 px-3 text-xs font-medium text-muted-foreground xl:table-cell">
                  {ownerHeading}
                </TableHead>
                <TableHead className="hidden h-9 px-3 text-xs font-medium text-muted-foreground xl:table-cell">
                  {t("colPlace")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("colRegistration")}
                </TableHead>
                <RowActionsHead className="h-9 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {failure ? (
                <ErrorStateTableRow
                  colSpan={colSpan}
                  kind={failure.kind}
                  detail={failure.detail}
                  title={t("loadFailedTitle")}
                  retry
                />
              ) : (
                visible.map((row) => {
                  const base = camporeeBasePath(row.kind, row.id);
                  const { range: dates, year } = formatCalendarDateRange(
                    row.start_date,
                    row.end_date,
                    locale,
                  );
                  return (
                    <TableRow key={`${row.kind}-${row.id}`}>
                      <TableCell className="px-3 py-2.5 align-middle">
                        <Link prefetch={false} href={base} className="font-medium hover:underline">
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                        {dates} {year}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate px-3 py-2.5 align-middle text-sm text-muted-foreground xl:table-cell">
                        {row.owner ?? "—"}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate px-3 py-2.5 align-middle text-sm text-muted-foreground xl:table-cell">
                        {row.place ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle">
                        <ExceptionStatus
                          value={row.registration}
                          normal={["open"]}
                          labels={registrationLabels}
                          intents={{ closed: "neutral", inactive: "neutral" }}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle">
                        <RowActions label={row.name} actions={actionsFor(row)} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {/* < md: two-line rows instead of a sideways-scrolling table */}
      {showTable && (
        <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
          {failure ? (
            <li className="p-0">
              <ErrorState kind={failure.kind} detail={failure.detail} title={t("loadFailedTitle")} retry />
            </li>
          ) : (
            visible.map((row) => {
              const base = camporeeBasePath(row.kind, row.id);
              const { range: dates, year } = formatCalendarDateRange(
                row.start_date,
                row.end_date,
                locale,
              );
              return (
                <li key={`${row.kind}-${row.id}`} className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link prefetch={false} href={base} className="truncate font-medium hover:underline">
                        {row.name}
                      </Link>
                      <ExceptionStatus
                        value={row.registration}
                        normal={["open"]}
                        labels={registrationLabels}
                        intents={{ closed: "neutral", inactive: "neutral" }}
                      />
                    </div>
                    <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                      <span>
                        {dates} {year}
                      </span>
                      {row.place && <span>{row.place}</span>}
                    </p>
                  </div>
                  <RowActions label={row.name} actions={actionsFor(row)} />
                </li>
              );
            })
          )}
        </ul>
      )}

      {!failure && rows.length === 0 && (
        <EmptyState
          icon={Tent}
          title={kind === "union" ? t("emptyUnionTitle") : t("emptyLocalTitle")}
          description={kind === "union" ? t("emptyUnionDescription") : t("emptyLocalDescription")}
        >
          {canCreate && (
            <Button asChild size="sm">
              <Link href={kind === "union" ? "/dashboard/campamentos/new?kind=union" : "/dashboard/campamentos/new"}>
                {kind === "union" ? tc("unionList.newCamporee") : tc("list.newCamporee")}
              </Link>
            </Button>
          )}
        </EmptyState>
      )}

      {!failure && rows.length > 0 && visible.length === 0 && filtered && (
        <EmptyState variant="no-results" icon={Tent} title={t("noResultsTitle")} description={t("noResultsDescription")}>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {t("clearFilters")}
          </Button>
        </EmptyState>
      )}

      {!failure && pagination.total > 0 && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
        />
      )}

      <CamporeeDeleteConfirm
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        kind={kind}
        camporee={deleting ? { id: deleting.id, name: deleting.name } : null}
      />
    </div>
  );
}
