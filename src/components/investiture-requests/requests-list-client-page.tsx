"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CalendarRange, MapPin, SearchX, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  EcclesiasticalYearSelect,
  type EcclesiasticalYear,
} from "@/components/shared/selectors/ecclesiastical-year-select";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvestitureRequest } from "@/lib/api/investiture-requests";
import { cn } from "@/lib/utils";
import { formatCivilDate, formatInstantDate } from "./format-date";

export interface RequestsListLoadError {
  status: number | null;
  /** Backend error code, when the failure carried one. */
  code?: string | null;
  message: string;
}

export interface RequestsListClientPageProps {
  /** Pending and fully resolved requests of the year (`include_resolved`). */
  requests: InvestitureRequest[];
  /** Year being shown; null when the catalog has no usable year. */
  yearId: number | null;
  years: EcclesiasticalYear[];
  loadError: RequestsListLoadError | null;
  /**
   * Server clock (ISO) used to compute the waiting time, so the server render
   * and the hydration agree on the number of days.
   */
  nowIso: string;
  /**
   * True when the viewer's only admin role is pastor. A pastor with no
   * districts is refused by the backend (403 INVESTITURE_REQUEST_FORBIDDEN);
   * that is an expected empty state for them, not an access problem.
   */
  isPastorOnly?: boolean;
}

const BASE_PATH = "/dashboard/investiture-requests";
const DAY_MS = 86_400_000;
/** From this many days of waiting the row is flagged. */
const SLOW_AFTER_DAYS = 7;

type TabValue = "pending" | "resolved";

function pendingOf(request: InvestitureRequest): number {
  return request.pending_count ?? 0;
}

function waitingDays(createdAt: string | undefined, nowIso: string): number | null {
  if (!createdAt) return null;
  const created = Date.parse(createdAt);
  const now = Date.parse(nowIso);
  if (Number.isNaN(created) || Number.isNaN(now)) return null;
  return Math.max(0, Math.floor((now - created) / DAY_MS));
}

function sortBySoonestDate(requests: InvestitureRequest[]): InvestitureRequest[] {
  return [...requests].sort((a, b) => {
    const left = a.earliest_investiture_date ?? null;
    const right = b.earliest_investiture_date ?? null;
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return left.localeCompare(right);
  });
}

function sortByNewest(requests: InvestitureRequest[]): InvestitureRequest[] {
  return [...requests].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

function matchesQuery(request: InvestitureRequest, query: string): boolean {
  if (!query) return true;
  const haystack = [request.club_name, request.section_name, request.district_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function RequestsListClientPage({
  requests,
  yearId,
  years,
  loadError,
  nowIso,
  isPastorOnly = false,
}: RequestsListClientPageProps) {
  const t = useTranslations("queues.investitures.list");
  const tLegacy = useTranslations("investiture_requests.list");
  const router = useRouter();
  const activeTab: TabValue = useUrlTab("tab", "pending") === "resolved" ? "resolved" : "pending";
  const [search, setSearch] = useState("");

  const { pending, resolved } = useMemo(
    () => ({
      pending: sortBySoonestDate(requests.filter((request) => pendingOf(request) > 0)),
      resolved: sortByNewest(requests.filter((request) => pendingOf(request) === 0)),
    }),
    [requests],
  );

  const query = search.trim().toLowerCase();
  const source = activeTab === "pending" ? pending : resolved;
  const visible = useMemo(
    () => source.filter((request) => matchesQuery(request, query)),
    [source, query],
  );

  function handleYearChange(nextYearId: number | null) {
    if (nextYearId === null || nextYearId === yearId) return;
    router.push(`${BASE_PATH}?year=${nextYearId}`);
  }

  const noDistricts =
    isPastorOnly &&
    loadError?.status === 403 &&
    (loadError.code == null || loadError.code === "INVESTITURE_REQUEST_FORBIDDEN");
  const forbidden = loadError?.status === 403 && !noDistricts;
  const failed = loadError !== null && !noDistricts && !forbidden;
  const ready = !loadError && yearId !== null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={ready ? t("finding", { count: pending.length }) : t("description")}
        actions={
          <div className="w-56">
            <EcclesiasticalYearSelect
              value={yearId}
              onChange={handleYearChange}
              years={years}
              activeOnly={false}
              placeholder={tLegacy("yearPlaceholder")}
            />
          </div>
        }
      />

      {noDistricts && (
        <EmptyState
          icon={MapPin}
          title={tLegacy("noDistrictsTitle")}
          description={tLegacy("noDistrictsDescription")}
        />
      )}

      {forbidden && (
        <EmptyState
          icon={ShieldCheck}
          title={t("whoAuthorizes.title")}
          description={t("whoAuthorizes.description")}
        />
      )}

      {failed && (
        <ErrorState
          retry
          description={loadError.message}
          detail={loadError.status !== null ? { code: loadError.status } : undefined}
        />
      )}

      {!loadError && yearId === null && (
        <EmptyState
          icon={CalendarRange}
          title={tLegacy("noYearTitle")}
          description={tLegacy("noYearDescription")}
        />
      )}

      {ready && (
        <>
          <UrlTabs
            ariaLabel={t("tabs.label")}
            defaultValue="pending"
            tabs={[
              { value: "pending", label: t("tabs.pending"), count: pending.length },
              { value: "resolved", label: t("tabs.resolved"), count: resolved.length },
            ]}
          />

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-full flex-col gap-1.5 sm:w-72">
              <Label htmlFor="investiture-search" className="text-xs text-muted-foreground">
                {t("searchLabel")}
              </Label>
              <Input
                id="investiture-search"
                type="search"
                value={search}
                placeholder={t("searchPlaceholder")}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {source.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title={activeTab === "pending" ? t("empty.pendingTitle") : t("empty.resolvedTitle")}
              description={
                activeTab === "pending"
                  ? t("empty.pendingDescription")
                  : t("empty.resolvedDescription")
              }
            />
          )}

          {source.length > 0 && visible.length === 0 && (
            <EmptyState
              variant="no-results"
              icon={SearchX}
              title={t("noResults.title")}
              description={t("noResults.description")}
            >
              <Button type="button" variant="outline" size="sm" onClick={() => setSearch("")}>
                {t("noResults.clear")}
              </Button>
            </EmptyState>
          )}

          {visible.length > 0 && (
            <RequestsTable requests={visible} tab={activeTab} nowIso={nowIso} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Rows ────────────────────────────────────────────────────────────────────

function hrefOf(request: InvestitureRequest): string {
  return `${BASE_PATH}/${encodeURIComponent(request.request_id)}`;
}

function RequestsTable({
  requests,
  tab,
  nowIso,
}: {
  requests: InvestitureRequest[];
  tab: TabValue;
  nowIso: string;
}) {
  const t = useTranslations("queues.investitures.list");
  const noValue = useTranslations("investiture_requests.list")("noValue");
  const locale = useLocale();
  const isPending = tab === "pending";

  const decided = (request: InvestitureRequest) =>
    t("result", { invested: request.invested_count ?? 0, rejected: request.rejected_count ?? 0 });

  const toDecide = (request: InvestitureRequest) =>
    request.people.length > 0
      ? t("undecided", { pending: pendingOf(request), total: request.people.length })
      : String(pendingOf(request));

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.section")}</TableHead>
              <TableHead>{t("columns.district")}</TableHead>
              {isPending ? (
                <>
                  <TableHead className="text-right">{t("columns.toDecide")}</TableHead>
                  <TableHead>{t("columns.investiture")}</TableHead>
                </>
              ) : (
                <TableHead>{t("columns.result")}</TableHead>
              )}
              <TableHead>{t("columns.submitted")}</TableHead>
              <RowActionsHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const href = hrefOf(request);
              const days = waitingDays(request.created_at, nowIso);
              const club = request.club_name ?? noValue;
              return (
                <TableRow key={request.request_id}>
                  <TableCell>
                    <Link
                      href={href}
                      prefetch={false}
                      className="font-medium hover:underline focus-visible:underline"
                    >
                      {club}
                    </Link>
                    <span className="block text-[13px] text-muted-foreground">
                      {request.section_name ?? noValue}
                    </span>
                  </TableCell>
                  <TableCell>{request.district_name ?? noValue}</TableCell>
                  {isPending ? (
                    <>
                      <TableCell className="text-right tabular-nums">{toDecide(request)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCivilDate(request.earliest_investiture_date, locale) ?? noValue}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-muted-foreground">{decided(request)}</TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    <span className="block text-muted-foreground">
                      {formatInstantDate(request.created_at, locale) ?? noValue}
                    </span>
                    {isPending && days !== null && <Waiting days={days} />}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      label={club}
                      actions={[]}
                      primary={
                        <Button asChild size="sm" variant="outline">
                          <Link href={href} prefetch={false}>
                            {isPending ? t("review") : t("view")}
                          </Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {requests.map((request) => {
          const days = waitingDays(request.created_at, nowIso);
          return (
            <li key={request.request_id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={hrefOf(request)}
                  prefetch={false}
                  className="min-w-0 font-medium hover:underline focus-visible:underline"
                >
                  {request.club_name ?? noValue}
                  <span className="block text-[13px] font-normal text-muted-foreground">
                    {request.section_name ?? noValue}
                  </span>
                </Link>
                {isPending && (
                  <span className="shrink-0 text-sm tabular-nums">{toDecide(request)}</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
                <span>{request.district_name ?? noValue}</span>
                {isPending ? (
                  <span>
                    {formatCivilDate(request.earliest_investiture_date, locale) ?? noValue}
                  </span>
                ) : (
                  <span>{decided(request)}</span>
                )}
                {isPending && days !== null && <Waiting days={days} />}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Waiting({ days }: { days: number }) {
  const t = useTranslations("queues.investitures.list");
  return (
    <span
      className={cn(
        "block text-[13px] tabular-nums",
        days >= SLOW_AFTER_DAYS
          ? "font-medium text-warning-foreground dark:text-warning"
          : "text-muted-foreground",
      )}
    >
      {t("waiting", { days })}
    </span>
  );
}
