"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { ScopePicker, type ScopeOption } from "@/components/shared/scope-picker";
import { MonthlyReportStatus } from "@/components/reports/monthly-report-status";
import { useToastError } from "@/lib/feedback/toast-retry";
import { triggerMonthlyReportPdfDownload } from "@/lib/api/monthly-reports";
import type { AdminReportItem, AdminReportsPage } from "@/lib/api/monthly-reports";
import type { ClubType } from "@/lib/api/catalogs";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDate } from "@/lib/format-locale";
import { currentReportScope, reportScopeParams } from "@/lib/reports/scope";
import { MONTHLY_STATUSES, monthlyYearOptions } from "@/lib/reports/status";
import { reportsTabHref } from "@/lib/reports/tabs";
import { capitalizeFirst } from "@/lib/utils";

const ALL = "all";
const MONTH_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
const COLUMNS = 6;

export type MonthlyTerritorySearchParams = {
  division_id?: string;
  union_id?: string;
  club_type_id?: string;
  local_field_id?: string;
  year?: string;
  month?: string;
  status?: string;
  page?: string;
  limit?: string;
};

export interface MonthlyTerritoryListProps {
  /** `null` when the list failed to load: the table shows the error, never an empty list. */
  data: AdminReportsPage | null;
  error?: ErrorStateFromError | null;
  clubTypes: ClubType[];
  /** Divisions, unions and local fields the actor can pick; one option means the scope is fixed. */
  scopeOptions: ScopeOption[];
  searchParams: MonthlyTerritorySearchParams;
  currentYear: number;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function MonthlyTerritoryList({
  data,
  error = null,
  clubTypes,
  scopeOptions,
  searchParams,
  currentYear,
}: MonthlyTerritoryListProps) {
  const t = useTranslations("evaluation.reports");
  const tr = useTranslations("reports");
  const ts = useTranslations("reports.supervisionClient");
  const router = useRouter();
  const formatDate = useFormatDate();
  const toastError = useToastError();
  const [query, setQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const year = searchParams.year ?? String(currentYear);
  const hasFilters = Boolean(
    searchParams.club_type_id ||
      searchParams.month ||
      searchParams.status ||
      searchParams.division_id ||
      searchParams.union_id ||
      searchParams.local_field_id ||
      year !== String(currentYear),
  );

  const loaded = data?.items;
  const items = useMemo(() => {
    const all = loaded ?? [];
    const needle = normalize(query.trim());
    if (!needle) return all;
    return all.filter((item) => normalize(item.club_name ?? "").includes(needle));
  }, [loaded, query]);

  const scopeId = currentReportScope(searchParams);
  const scopeOption = scopeOptions.find((option) => option.id === scopeId);
  const lockedScope = scopeOptions.length <= 1;

  function go(overrides: Record<string, string | undefined>) {
    router.push(reportsTabHref("monthly", { ...searchParams, ...overrides }));
  }

  function setFilter(key: keyof MonthlyTerritorySearchParams, value: string) {
    go({ [key]: value === ALL ? undefined : value, page: undefined });
  }

  function clearFilters() {
    setQuery("");
    router.push(reportsTabHref("monthly", { limit: searchParams.limit }));
  }

  async function download(item: AdminReportItem) {
    setDownloadingId(item.monthly_report_id);
    try {
      await triggerMonthlyReportPdfDownload(item.monthly_report_id);
    } catch (err) {
      toastError({
        title: t("errors.download"),
        ...(err instanceof Error && err.message ? { description: err.message } : {}),
        onRetry: () => void download(item),
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const periodOf = (item: AdminReportItem) =>
    capitalizeFirst(formatDate(new Date(item.year, item.month - 1, 1), { month: "long", year: "numeric" }));
  const dayOf = (value: string | null) =>
    value ? formatDate(value, { day: "numeric", month: "short", year: "numeric" }) : null;

  const actionsFor = (item: AdminReportItem) => [
    { label: ts("actionView"), icon: Eye, href: `/dashboard/reports/${item.monthly_report_id}` },
    {
      label: ts("actionPdf"),
      icon: Download,
      onSelect: () => void download(item),
      disabled: downloadingId === item.monthly_report_id,
      hidden: item.status === "draft",
    },
  ];

  const limit = data?.limit ?? 20;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {!lockedScope && (
        <ScopePicker
          value={
            scopeOption
              ? { id: scopeOption.id, name: scopeOption.name, ...(scopeOption.group ? { level: scopeOption.group } : {}) }
              : undefined
          }
          options={scopeOptions}
          allLabel={t("territory.scopeAll")}
          onChange={(id) => go({ ...reportScopeParams(id), page: undefined })}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-56">
          <Label htmlFor="reports-search">{t("territory.searchLabel")}</Label>
          <Input
            id="reports-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("territory.searchPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-club-type">{ts("filterClubTypePlaceholder")}</Label>
          <Select value={searchParams.club_type_id ?? ALL} onValueChange={(v) => setFilter("club_type_id", v)}>
            <SelectTrigger id="reports-filter-club-type" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{ts("filterClubTypeAll")}</SelectItem>
              {clubTypes.map((clubType) => (
                <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                  {clubType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-month">{ts("filterMonthPlaceholder")}</Label>
          <Select value={searchParams.month ?? ALL} onValueChange={(v) => setFilter("month", v)}>
            <SelectTrigger id="reports-filter-month" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{ts("filterMonthAll")}</SelectItem>
              {MONTH_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {tr(`months.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-year">{ts("filterYearPlaceholder")}</Label>
          <Select value={year} onValueChange={(v) => setFilter("year", v)}>
            <SelectTrigger id="reports-filter-year" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthlyYearOptions(currentYear).map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-status">{ts("filterStatusPlaceholder")}</Label>
          <Select value={searchParams.status ?? ALL} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger id="reports-filter-status" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{ts("filterStatusAll")}</SelectItem>
              {MONTHLY_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.trim() !== "" && (
        <p className="text-xs text-muted-foreground">{t("territory.searchPageOnly")}</p>
      )}

      {error ? (
        <DataTableShell>
          <Table>
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{ts("tableColClub")}</TableHead>
                <TableHead>{ts("tableColPeriod")}</TableHead>
                <TableHead>{ts("tableColStatus")}</TableHead>
                <TableHead className="hidden lg:table-cell">{ts("tableColGenerated")}</TableHead>
                <TableHead className="hidden lg:table-cell">{ts("tableColSubmitted")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow colSpan={COLUMNS} kind={error.kind} {...(error.detail ? { detail: error.detail } : {})} retry />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : items.length === 0 ? (
        hasFilters || query.trim() !== "" ? (
          <EmptyState
            icon={FileText}
            variant="no-results"
            title={ts("emptyTitle")}
            description={ts("emptyHint")}
          >
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {t("territory.clearFilters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={FileText}
            title={t("territory.emptyTitle", { year })}
            description={t("territory.emptyDescription")}
          />
        )
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ts("tableColClub")}</TableHead>
                  <TableHead>{ts("tableColPeriod")}</TableHead>
                  <TableHead>{ts("tableColStatus")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{ts("tableColGenerated")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{ts("tableColSubmitted")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const period = periodOf(item);
                  const sub = [item.club_type, item.local_field].filter(Boolean).join(" · ");
                  return (
                    <TableRow key={item.monthly_report_id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/reports/${item.monthly_report_id}`}
                          className="font-medium hover:underline"
                        >
                          {item.club_name ?? "—"}
                        </Link>
                        {sub ? <span className="block text-xs text-muted-foreground">{sub}</span> : null}
                      </TableCell>
                      <TableCell>{period}</TableCell>
                      <TableCell>
                        <MonthlyReportStatus status={item.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {dayOf(item.generated_at) ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {dayOf(item.submitted_at) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={[item.club_name ?? item.monthly_report_id, item.club_type, period]
                            .filter(Boolean)
                            .join(" · ")}
                          actions={actionsFor(item)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="md:hidden" aria-label={t("territory.listLabel")}>
            {items.map((item) => {
              const period = periodOf(item);
              const details = [item.club_type, item.local_field, period].filter(Boolean).join(" · ");
              return (
                <li key={item.monthly_report_id} className="flex items-start gap-2 border-b py-3 last:border-b-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/reports/${item.monthly_report_id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {item.club_name ?? "—"}
                      </Link>
                      <MonthlyReportStatus status={item.status} />
                    </div>
                    <p className="text-[13px] text-muted-foreground tabular-nums">{details}</p>
                  </div>
                  <RowActions
                    label={[item.club_name ?? item.monthly_report_id, period].join(" · ")}
                    actions={actionsFor(item)}
                  />
                </li>
              );
            })}
          </ul>

          <DataTablePagination page={data?.page ?? 1} totalPages={totalPages} total={total} limit={limit} />
        </>
      )}
    </div>
  );
}
