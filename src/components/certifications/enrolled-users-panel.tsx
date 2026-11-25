"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  UserProgressSheet,
  type ProgressTarget,
} from "@/components/certifications/user-progress-sheet";
import type {
  CertificationEnrollmentRow,
  CertificationEnrollmentsPage,
} from "@/lib/api/certifications";
import {
  ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS_INTENTS,
  NORMAL_ENROLLMENT_STATUSES,
  enrollmentFullName,
  isEnrollmentStatus,
} from "@/lib/certifications/enrollment-status";
import { useFormatDate } from "@/lib/format-locale";

interface EnrolledUsersPanelProps {
  data: CertificationEnrollmentsPage;
  certificationId: number;
  /** Current `?search=` (applied on the server). */
  search: string;
  /** Current `?status=` (applied on the server). */
  status: string;
}

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const SEARCH_DEBOUNCE_MS = 350;

function ProgressMeter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        className="h-1 w-24 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-foreground/70 transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}

export function EnrolledUsersPanel({
  data,
  certificationId,
  search,
  status,
}: EnrolledUsersPanelProps) {
  const t = useTranslations("evaluation.certYear.certifications.enrolled");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formatDate = useFormatDate();

  const [query, setQuery] = useState(search);
  const [target, setTarget] = useState<ProgressTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleSearch(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateParams({ search: value.trim() || null });
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearFilters() {
    setQuery("");
    updateParams({ search: null, status: null });
  }

  function openProgress(row: CertificationEnrollmentRow) {
    setTarget({ userId: row.user_id, name: enrollmentFullName(row) || row.user_id });
    setSheetOpen(true);
  }

  const isFiltered = search.length > 0 || status.length > 0;
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const statusLabels = Object.fromEntries(
    ENROLLMENT_STATUSES.map((value) => [value, t(`status.${value}`)]),
  ) as Record<(typeof ENROLLMENT_STATUSES)[number], string>;

  function renderStatus(row: CertificationEnrollmentRow) {
    if (!isEnrollmentStatus(row.status)) {
      return <StatusBadge intent="neutral" label={row.status} />;
    }
    return (
      <ExceptionStatus
        value={row.status}
        normal={NORMAL_ENROLLMENT_STATUSES}
        labels={statusLabels}
        intents={ENROLLMENT_STATUS_INTENTS}
      />
    );
  }

  function clubLine(row: CertificationEnrollmentRow) {
    return [row.club_name, row.section_name].filter(Boolean).join(" · ");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ListFilterField id="enrolled-search" label={t("searchLabel")} className="w-[280px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="enrolled-search"
              className="pl-9"
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        </ListFilterField>
        <ListFilterField id="enrolled-status" label={t("statusLabel")}>
          <NativeSelect
            id="enrolled-status"
            className="w-full"
            value={status}
            onChange={(event) => updateParams({ status: event.target.value || null })}
          >
            <NativeSelectOption value="">{t("statusAll")}</NativeSelectOption>
            {ENROLLMENT_STATUSES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {statusLabels[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </ListFilterField>
      </div>

      {data.items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            variant="no-results"
            title={t("noResultsTitle")}
            description={t("noResultsDescription")}
          >
            <Button type="button" variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />
        )
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>{t("colPerson")}</TableHead>
                  <TableHead className={HEAD}>{t("colEnrolled")}</TableHead>
                  <TableHead className={HEAD}>{t("colProgress")}</TableHead>
                  <TableHead className={HEAD}>{t("colStatus")}</TableHead>
                  <RowActionsHead className="h-9 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => {
                  const name = enrollmentFullName(row) || row.user_id;
                  return (
                    <TableRow key={row.enrollment_id || row.user_id} className="hover:bg-muted/30">
                      <TableCell className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={() => openProgress(row)}
                        >
                          {name}
                        </button>
                        {clubLine(row) ? (
                          <p className="text-[13px] text-muted-foreground">{clubLine(row)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                        {row.enrollment_date ? formatDate(row.enrollment_date) : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle">
                        <ProgressMeter value={row.progress_percent} label={t("colProgress")} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle">{renderStatus(row)}</TableCell>
                      <TableCell className="px-3 py-2.5 align-middle">
                        <RowActions
                          label={name}
                          actions={[
                            { label: t("viewProgress"), icon: BarChart3, onSelect: () => openProgress(row) },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
            {data.items.map((row) => {
              const name = enrollmentFullName(row) || row.user_id;
              return (
                <li key={row.enrollment_id || row.user_id} className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 truncate text-left font-medium hover:underline"
                        onClick={() => openProgress(row)}
                      >
                        {name}
                      </button>
                      {renderStatus(row)}
                    </div>
                    <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                      {clubLine(row) ? <span>{clubLine(row)}</span> : null}
                      <span>{Math.round(row.progress_percent)}%</span>
                      {row.enrollment_date ? <span>{formatDate(row.enrollment_date)}</span> : null}
                    </p>
                  </div>
                  <RowActions
                    label={name}
                    actions={[
                      { label: t("viewProgress"), icon: BarChart3, onSelect: () => openProgress(row) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>

          <DataTablePagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            limit={data.limit}
          />
        </>
      )}

      <UserProgressSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        target={target}
        certificationId={certificationId}
      />
    </div>
  );
}
