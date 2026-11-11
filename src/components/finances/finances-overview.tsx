"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import {
  getFinanceOverview,
  type FinanceOverviewRow,
} from "@/lib/api/finances";
import type { LocalField } from "@/lib/api/geography";
import {
  pickYearOptions,
  type YearRow,
} from "@/lib/ecclesiastical-year-options";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { useFormatCurrency, useFormatDate } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

export const FINANCES_OVERVIEW_LIMIT = 100;

const ALL = "";
const HEAD_CLASS = "h-9 px-3 text-xs font-medium text-muted-foreground";
const NUMBER_HEAD_CLASS = `${HEAD_CLASS} text-right`;
// Only on md..lg: below md the table scrolls inside its shell, from xl it has room.
const HIDE_NARROW = "md:max-xl:hidden";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** Calendar year of an ecclesiastical-year row: the 4-digit year of its name, else of its start date. */
export function calendarYearOf(row: YearRow): number | null {
  const fromName = /\b(20\d{2})\b/.exec(row.name);
  if (fromName) return Number(fromName[1]);
  const fromDate = row.start_date ? Number(row.start_date.slice(0, 4)) : NaN;
  return Number.isInteger(fromDate) ? fromDate : null;
}

interface FinancesOverviewProps {
  /** Local fields inside the actor's territory (already scoped by the server page). */
  localFields: LocalField[];
  /** False when the actor is bound to a single local field. */
  showLocalFieldFilter: boolean;
  years: YearRow[];
  activeYearId: number | null;
}

export function FinancesOverview({
  localFields,
  showLocalFieldFilter,
  years,
  activeYearId,
}: FinancesOverviewProps) {
  const t = useTranslations("finances");
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const formatAmount = (value: number) => formatFinanceAmount(value, formatCurrency);

  const yearOptions = useMemo(
    () => pickYearOptions(years, activeYearId),
    [years, activeYearId],
  );
  const [yearChoice, setYearChoice] = useState<string | undefined>(undefined);
  const [localFieldId, setLocalFieldId] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [page, setPage] = useState(1);

  const yearValue =
    yearChoice ??
    (yearOptions.some((o) => o.value === String(activeYearId))
      ? String(activeYearId)
      : (yearOptions[0]?.value ?? ALL));
  const selectedYearRow = years.find(
    (row) => String(row.ecclesiastical_year_id) === yearValue,
  );
  const year =
    (selectedYearRow ? calendarYearOf(selectedYearRow) : null) ??
    new Date().getFullYear();
  const monthNumber = month === ALL ? undefined : Number(month);
  const localFieldFilter = localFieldId === ALL ? undefined : Number(localFieldId);

  const query = useQuery({
    queryKey: ["finances-overview", localFieldFilter, year, monthNumber, page],
    queryFn: () =>
      getFinanceOverview({
        localFieldId: localFieldFilter,
        year,
        month: monthNumber,
        page,
        limit: FINANCES_OVERVIEW_LIMIT,
      }),
  });

  const data = query.data;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function monthName(value: number): string {
    const key = MONTH_KEYS[value - 1];
    return key ? t(`months.${key}`) : String(value);
  }

  function openClub(clubId: number) {
    router.push(`/dashboard/finances?club=${clubId}`);
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showLocalFieldFilter ? (
            <FilterSelect
              id="finances-overview-local-field"
              label={t("overview.filters.localField")}
              value={localFieldId}
              onChange={(value) => changeFilter(setLocalFieldId, value)}
              allLabel={t("overview.filters.allLocalFields")}
              options={localFields.map((field) => ({
                value: String(field.local_field_id),
                label: field.name,
              }))}
            />
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="finances-overview-year"
              className="text-xs text-muted-foreground"
            >
              {t("overview.filters.year")}
            </Label>
            <NativeSelect
              id="finances-overview-year"
              className="w-full"
              value={yearValue}
              onChange={(event) => {
                setYearChoice(event.target.value);
                setPage(1);
              }}
            >
              {yearOptions.length === 0 ? (
                <option value={ALL}>{year}</option>
              ) : null}
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <FilterSelect
            id="finances-overview-month"
            label={t("overview.filters.month")}
            value={month}
            onChange={(value) => changeFilter(setMonth, value)}
            allLabel={t("overview.filters.allMonths")}
            options={MONTH_KEYS.map((key, index) => ({
              value: String(index + 1),
              label: t(`months.${key}`),
            }))}
          />
        </div>

        {query.isPending ? (
          <div className="space-y-3" aria-busy="true" data-testid="finances-overview-loading">
            <Skeleton className="h-20 w-full rounded-xl" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : query.isError && !data ? (
          <EndpointErrorBanner
            state="missing"
            detail={t("overview.loadError")}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : data ? (
          <>
            <KpiStrip rowFrom="xl" aria-label={t("overview.totals.label")}>
              <KpiStripItem
                label={t("overview.totals.income")}
                value={`+${formatAmount(data.totals.income)}`}
                valueClassName="text-success"
              />
              <KpiStripItem
                label={t("overview.totals.expenses")}
                value={`−${formatAmount(data.totals.expenses)}`}
              />
              <KpiStripItem
                label={t("overview.totals.net")}
                value={formatAmount(data.totals.net)}
                valueClassName={data.totals.net < 0 ? "text-destructive" : undefined}
              />
              <KpiStripItem
                label={t("overview.totals.balance")}
                value={formatAmount(data.totals.balance)}
                valueClassName={data.totals.balance < 0 ? "text-destructive" : undefined}
                emphasis
              />
              <KpiStripItem
                label={t("overview.totals.movements")}
                value={data.totals.movements}
              />
            </KpiStrip>

            {data.data.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={t("overview.empty.title")}
                description={t("overview.empty.description")}
              />
            ) : (
              <>
                {query.isError ? (
                  <EndpointErrorBanner
                    state="missing"
                    detail={t("overview.loadError")}
                    onRetry={() => void query.refetch()}
                    retrying={query.isFetching}
                  />
                ) : null}
                <DataTableShell aria-busy={query.isFetching}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={HEAD_CLASS}>{t("overview.table.club")}</TableHead>
                        <TableHead className={cn(HEAD_CLASS, HIDE_NARROW)}>
                          {t("overview.table.localField")}
                        </TableHead>
                        <TableHead className={NUMBER_HEAD_CLASS}>{t("overview.table.income")}</TableHead>
                        <TableHead className={NUMBER_HEAD_CLASS}>{t("overview.table.expenses")}</TableHead>
                        <TableHead className={NUMBER_HEAD_CLASS}>{t("overview.table.net")}</TableHead>
                        <TableHead className={NUMBER_HEAD_CLASS}>{t("overview.table.balance")}</TableHead>
                        <TableHead className={NUMBER_HEAD_CLASS}>{t("overview.table.movements")}</TableHead>
                        <TableHead className={HEAD_CLASS}>{t("overview.table.missedMonths")}</TableHead>
                        <TableHead className={HEAD_CLASS}>{t("overview.table.lastMovement")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.data.map((row) => (
                        <OverviewRow
                          key={row.club_id}
                          row={row}
                          formatAmount={formatAmount}
                          lastMovement={
                            row.last_movement_at
                              ? formatDate(row.last_movement_at, {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : t("overview.noLastMovement")
                          }
                          missedNames={row.missed_months.map(monthName).join(", ")}
                          onOpen={() => openClub(row.club_id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </DataTableShell>
                <DataTablePagination
                  page={data.meta.page}
                  totalPages={totalPages}
                  total={data.meta.total}
                  limit={FINANCES_OVERVIEW_LIMIT}
                  limitOptions={[FINANCES_OVERVIEW_LIMIT]}
                  onPageChange={setPage}
                  onPageSizeChange={() => setPage(1)}
                />
              </>
            )}
          </>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function OverviewRow({
  row,
  formatAmount,
  lastMovement,
  missedNames,
  onOpen,
}: {
  row: FinanceOverviewRow;
  formatAmount: (value: number) => string;
  lastMovement: string;
  missedNames: string;
  onOpen: () => void;
}) {
  const t = useTranslations("finances.overview");
  const number = "px-3 py-2.5 align-middle text-right text-sm tabular-nums";

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/30"
      onClick={onOpen}
      data-testid={`finances-overview-row-${row.club_id}`}
    >
      <TableCell className="min-w-40 px-3 py-2.5 align-middle">
        <Link
          href={`/dashboard/finances?club=${row.club_id}`}
          aria-label={t("table.openClub", { club: row.club_name })}
          onClick={(event) => event.stopPropagation()}
          className="block max-w-full truncate rounded-sm text-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {row.club_name}
        </Link>
      </TableCell>
      <TableCell
        className={cn(
          "px-3 py-2.5 align-middle text-sm text-muted-foreground",
          HIDE_NARROW,
        )}
      >
        {row.local_field?.name ?? "—"}
      </TableCell>
      <TableCell className={cn(number, "text-success")}>
        {formatAmount(row.income)}
      </TableCell>
      <TableCell className={number}>{formatAmount(row.expenses)}</TableCell>
      <TableCell className={cn(number, row.net < 0 && "text-destructive")}>
        {formatAmount(row.net)}
      </TableCell>
      <TableCell className={cn(number, row.balance < 0 && "text-destructive")}>
        {formatAmount(row.balance)}
      </TableCell>
      <TableCell className={number}>{row.movements}</TableCell>
      <TableCell className="px-3 py-2.5 align-middle">
        {row.months_without_movements > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="soft-warning" tabIndex={0}>
                {t("missed.badge", { count: row.months_without_movements })}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {t("missed.tooltip", { months: missedNames })}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant="soft-success">{t("missed.none")}</Badge>
        )}
      </TableCell>
      <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground tabular-nums">
        {lastMovement}
      </TableCell>
    </TableRow>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
