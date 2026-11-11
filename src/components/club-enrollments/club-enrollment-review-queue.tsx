"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ClipboardList, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ClubEnrollmentReviewSheet } from "@/components/club-enrollments/club-enrollment-review-sheet";
import {
  CLUB_ENROLLMENTS_LIST_KEY,
  useEnrollmentRoleLabel,
} from "@/components/club-enrollments/club-enrollment-shared";
import {
  listClubEnrollmentQueue,
  type ClubEnrollmentCounts,
  type ClubEnrollmentItem,
  type ClubEnrollmentReviewStatus,
} from "@/lib/api/club-enrollment-review";
import {
  getActiveEcclesiasticalYearId,
  listClubTypes,
  listEcclesiasticalYears,
} from "@/lib/api/catalogs";
import { listLocalFields } from "@/lib/api/geography";
import { unwrapApiData } from "@/lib/api/unwrap";
import { pickYearOptions } from "@/lib/ecclesiastical-year-options";
import { useFormatDate } from "@/lib/format-locale";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;
const ALL = "";

const TABS: ReadonlyArray<{
  status: ClubEnrollmentReviewStatus;
  label: "pending" | "approved" | "rejected";
}> = [
  { status: "pending_validation", label: "pending" },
  { status: "active", label: "approved" },
  { status: "rejected", label: "rejected" },
];

// Only on md..lg: below md the rows stack as cards and must keep every field.
const HIDE_NARROW = "md:max-xl:hidden";
const ACTIONS_CLASS = "w-px whitespace-nowrap";
const HEAD_CLASS = "h-9 px-3 text-xs font-medium text-muted-foreground";
const CATALOG_STALE_MS = 5 * 60_000;

function toId(value: string): number | null {
  const parsed = Number(value);
  return value !== ALL && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function personName(person: { user_id: string; name: string | null } | null): string {
  if (!person) return "—";
  return person.name?.trim() || person.user_id;
}

export function ClubEnrollmentReviewQueue() {
  const t = useTranslations("club_enrollments");
  const formatDate = useFormatDate();
  const roleLabel = useEnrollmentRoleLabel();

  const [status, setStatus] = useState<ClubEnrollmentReviewStatus>("pending_validation");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  // undefined = user did not choose: the current year applies.
  const [yearChoice, setYearChoice] = useState<string | undefined>(undefined);
  const [localFieldId, setLocalFieldId] = useState(ALL);
  const [clubTypeId, setClubTypeId] = useState(ALL);
  const [selected, setSelected] = useState<ClubEnrollmentItem | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch((current) => {
        const next = searchInput.trim();
        if (next !== current) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Catalog calls never block the queue: if one fails the filter just offers «Todos».
  const currentYear = useQuery({
    queryKey: ["club-enrollments", "current-year"],
    queryFn: getActiveEcclesiasticalYearId,
    staleTime: CATALOG_STALE_MS,
  });
  const years = useQuery({
    queryKey: ["club-enrollments", "years"],
    queryFn: async () => unwrapApiData<Awaited<ReturnType<typeof listEcclesiasticalYears>>>(await listEcclesiasticalYears()),
    staleTime: CATALOG_STALE_MS,
  });
  const localFields = useQuery({
    queryKey: ["club-enrollments", "local-fields"],
    queryFn: async () => unwrapApiData<Awaited<ReturnType<typeof listLocalFields>>>(await listLocalFields()),
    staleTime: CATALOG_STALE_MS,
  });
  const clubTypes = useQuery({
    queryKey: ["club-enrollments", "club-types"],
    queryFn: async () => unwrapApiData<Awaited<ReturnType<typeof listClubTypes>>>(await listClubTypes()),
    staleTime: CATALOG_STALE_MS,
  });

  const yearOptions = pickYearOptions(years.data ?? [], currentYear.data ?? null);
  const yearId =
    yearChoice !== undefined ? toId(yearChoice) : (currentYear.data ?? null);
  const yearReady = yearChoice !== undefined || !currentYear.isPending;
  const localFieldFilter = toId(localFieldId);
  const clubTypeFilter = toId(clubTypeId);

  const query = useQuery({
    queryKey: [
      ...CLUB_ENROLLMENTS_LIST_KEY,
      status,
      search,
      yearId,
      localFieldFilter,
      clubTypeFilter,
      page,
      limit,
    ],
    queryFn: () =>
      listClubEnrollmentQueue({
        status,
        search,
        ecclesiasticalYearId: yearId,
        localFieldId: localFieldFilter,
        clubTypeId: clubTypeFilter,
        page,
        limit,
      }),
    enabled: yearReady,
    staleTime: 30_000,
  });

  const data = query.data;
  // Counts cover the whole scope: keep the last known ones while another tab loads.
  const [counts, setCounts] = useState<ClubEnrollmentCounts | null>(null);
  const [countsSource, setCountsSource] = useState(data);
  if (data !== countsSource) {
    setCountsSource(data);
    if (data) setCounts(data.meta.counts);
  }
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // An action can empty the last page: step back to the last one that exists.
  if (data && data.items.length === 0 && total > 0 && page > totalPages) {
    setPage(totalPages);
  }

  function selectStatus(next: ClubEnrollmentReviewStatus) {
    setStatus(next);
    setPage(1);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const isFiltered =
    search.length > 0 || localFieldFilter !== null || clubTypeFilter !== null;
  const emptyKey =
    status === "pending_validation" ? "pending" : status === "active" ? "approved" : "rejected";
  const reviewed = status !== "pending_validation";
  const loading = !yearReady || query.isPending;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setLocalFieldId(ALL);
    setClubTypeId(ALL);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(value) => selectStatus(value as ClubEnrollmentReviewStatus)}>
        <div className="flex flex-col gap-3">
          <TabsList aria-label={t("tabs.label")}>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.status} value={tab.status}>
                {t(`tabs.${tab.label}`)}
                {counts ? (
                  <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                    {counts[tab.label]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="club-enrollments-search" className="text-xs text-muted-foreground">
                {t("search.label")}
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="club-enrollments-search"
                  type="search"
                  value={searchInput}
                  maxLength={100}
                  placeholder={t("search.placeholder")}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <FilterSelect
              id="club-enrollments-year"
              label={t("filters.year")}
              value={yearChoice ?? (yearId ? String(yearId) : ALL)}
              onChange={(value) => changeFilter(setYearChoice, value)}
              allLabel={t("filters.currentYear")}
              options={yearOptions}
            />
            <FilterSelect
              id="club-enrollments-local-field"
              label={t("filters.localField")}
              value={localFieldId}
              onChange={(value) => changeFilter(setLocalFieldId, value)}
              allLabel={t("filters.allLocalFields")}
              options={(localFields.data ?? []).map((f) => ({
                value: String(f.local_field_id),
                label: f.name,
              }))}
            />
            <FilterSelect
              id="club-enrollments-club-type"
              label={t("filters.clubType")}
              value={clubTypeId}
              onChange={(value) => changeFilter(setClubTypeId, value)}
              allLabel={t("filters.allClubTypes")}
              options={(clubTypes.data ?? []).map((c) => ({
                value: String(c.club_type_id),
                label: c.name,
              }))}
            />
          </div>
        </div>

        <TabsContent value={status} className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3" aria-busy="true" data-testid="club-enrollments-loading">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-8 w-20" />
                </div>
              ))}
            </div>
          ) : query.isError && !data ? (
            <EndpointErrorBanner
              state="missing"
              detail={t("toasts.listFailed")}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : data && data.items.length === 0 ? (
            isFiltered ? (
              <EmptyState
                icon={Search}
                variant="no-results"
                title={t("empty.noResultsTitle")}
                description={t("empty.noResultsDescription")}
              >
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t("empty.clearFilters")}
                </Button>
              </EmptyState>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title={t(`empty.${emptyKey}.title`)}
                description={t(`empty.${emptyKey}.description`)}
              />
            )
          ) : data ? (
            <>
              {query.isError ? (
                <EndpointErrorBanner
                  state="missing"
                  detail={t("toasts.listFailed")}
                  onRetry={() => void query.refetch()}
                  retrying={query.isFetching}
                />
              ) : null}
              <DataTableShell aria-busy={query.isFetching}>
                <Table className="max-md:block">
                  <TableHeader className="max-md:sr-only">
                    <TableRow>
                      <TableHead className={HEAD_CLASS}>{t("table.club")}</TableHead>
                      <TableHead className={`${HEAD_CLASS} ${HIDE_NARROW}`}>{t("table.localField")}</TableHead>
                      <TableHead className={HEAD_CLASS}>{t("table.director")}</TableHead>
                      <TableHead className={HEAD_CLASS}>{t("table.submitted")}</TableHead>
                      {reviewed ? (
                        <>
                          <TableHead className={HEAD_CLASS}>{t("table.reviewer")}</TableHead>
                          <TableHead className={HEAD_CLASS}>{t("table.reviewedAt")}</TableHead>
                        </>
                      ) : null}
                      <TableHead className={`${HEAD_CLASS} ${ACTIONS_CLASS} text-right`}>{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="max-md:block">
                    {data.items.map((item) => (
                      <EnrollmentRow
                        key={item.enrollment_id}
                        item={item}
                        reviewed={reviewed}
                        submitted={formatDate(item.submitted_at ?? item.created_at)}
                        reviewer={
                          item.reviewed_by
                            ? `${personName(item.reviewed_by)}${
                                item.reviewer_role ? ` · ${roleLabel(item.reviewer_role)}` : ""
                              }`
                            : "—"
                        }
                        reviewedAt={item.reviewed_at ? formatDate(item.reviewed_at) : "—"}
                        actionLabel={reviewed ? t("table.view") : t("table.review")}
                        onOpen={() => setSelected(item)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <ClubEnrollmentReviewSheet
        item={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
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
      <NativeSelect id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)}>
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

function EnrollmentRow({
  item,
  reviewed,
  submitted,
  reviewer,
  reviewedAt,
  actionLabel,
  onOpen,
}: {
  item: ClubEnrollmentItem;
  reviewed: boolean;
  submitted: string;
  reviewer: string;
  reviewedAt: string;
  actionLabel: string;
  onOpen: () => void;
}) {
  const muted = "px-3 py-2.5 align-middle text-sm text-muted-foreground tabular-nums max-md:p-0 max-md:text-[13px]";
  return (
    <TableRow className="hover:bg-muted/30 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3">
      <TableCell className="min-w-40 px-3 py-2.5 align-middle max-md:order-1 max-md:min-w-0 max-md:max-w-none max-md:flex-1 max-md:p-0">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate rounded-sm text-left text-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {item.club.name}
        </button>
        <span className="block truncate text-xs text-muted-foreground">{item.section.club_type_name}</span>
      </TableCell>
      <TableCell className={`${muted} ${HIDE_NARROW} max-md:order-3`}>{item.local_field.name}</TableCell>
      <TableCell className={`${muted} max-md:order-4`}>{personName(item.board.director)}</TableCell>
      <TableCell className={`${muted} max-md:order-5`}>{submitted}</TableCell>
      {reviewed ? (
        <>
          <TableCell className={`${muted} max-md:order-6`}>{reviewer}</TableCell>
          <TableCell className={`${muted} max-md:order-7`}>{reviewedAt}</TableCell>
        </>
      ) : null}
      <TableCell className={`px-3 py-2.5 text-right align-middle ${ACTIONS_CLASS} max-md:order-2 max-md:p-0`}>
        <Button
          type="button"
          size="sm"
          variant={reviewed ? "outline" : "soft"}
          aria-label={`${actionLabel}: ${item.club.name}`}
          onClick={onOpen}
        >
          {actionLabel}
        </Button>
      </TableCell>
    </TableRow>
  );
}
