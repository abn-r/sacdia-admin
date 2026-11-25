"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart3, Eye, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/annual-rankings/progress-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { ScopePicker } from "@/components/shared/scope-picker";
import { Segmented } from "@/components/shared/segmented";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRememberedScope } from "@/hooks/use-remembered-scope";
import { readRecalculateOutcome } from "@/lib/annual-folders/recalculate-result";
import { recalculateRankings } from "@/lib/api/annual-folders";
import {
  listAnnualRankingsFromClient,
  type AnnualRankingLeaderboardRow,
} from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import type { LocalField } from "@/lib/api/geography";
import { useFormatNumber } from "@/lib/format-locale";
import {
  clampPercent,
  commonMaxPoints,
  paginate,
  recognitionStatus,
  sortByProgress,
} from "@/lib/progress/annual";

const SCOPE_KEY = "local_field";
const DEFAULT_LIMIT = 20;

export interface AnnualProgressClientPageProps {
  initialRows: AnnualRankingLeaderboardRow[];
  /** The first load failed on the server: the table frame shows the error. */
  initialError?: ErrorStateFromError | null;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  localFields: LocalField[];
  initialClubTypeId: number;
  initialYearId: number;
  initialLocalFieldId?: number;
}

function breakdownHref(row: AnnualRankingLeaderboardRow, fallbackYearId: number): string | null {
  if (!row.club_section_id) return null;
  const yearId = row.ecclesiastical_year_id ?? fallbackYearId;
  return `/dashboard/annual-folders/rankings/${row.club_section_id}/breakdown?year_id=${yearId}`;
}

function RecognitionCell({ row }: { row: AnnualRankingLeaderboardRow }) {
  const t = useTranslations("evaluation.progress.annual");
  const formatNumber = useFormatNumber();
  const status = recognitionStatus(row);

  if (status.kind === "none") {
    return <span className="text-muted-foreground">{t("recognition.none")}</span>;
  }

  const missing = (next: { name: string; pointsToReach: number }) =>
    t("recognition.missing", { points: formatNumber(next.pointsToReach), tier: next.name });

  if (status.kind === "missing") {
    return <span className="text-muted-foreground">{missing(status.next)}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="font-medium">{status.name}</span>
      {status.next ? <span className="text-xs text-muted-foreground">{missing(status.next)}</span> : null}
    </div>
  );
}

export function AnnualProgressClientPage({
  initialRows,
  initialError = null,
  clubTypes,
  ecclesiasticalYears,
  localFields,
  initialClubTypeId,
  initialYearId,
  initialLocalFieldId,
}: AnnualProgressClientPageProps) {
  const t = useTranslations("evaluation.progress.annual");
  const formatNumber = useFormatNumber();

  const [clubTypeId, setClubTypeId] = useState(initialClubTypeId);
  const [yearId, setYearId] = useState(initialYearId);
  const [remembered, setRemembered] = useRememberedScope(SCOPE_KEY);
  const fallbackFieldId = initialLocalFieldId ?? localFields[0]?.local_field_id;
  const localFieldId = useMemo(() => {
    const parsed = remembered === null ? NaN : Number(remembered);
    return localFields.some((field) => field.local_field_id === parsed) ? parsed : fallbackFieldId;
  }, [remembered, localFields, fallbackFieldId]);

  const filterKey = `${clubTypeId}:${yearId}:${localFieldId ?? ""}`;
  const initialKey = `${initialClubTypeId}:${initialYearId}:${initialLocalFieldId ?? localFields[0]?.local_field_id ?? ""}`;

  const [rows, setRows] = useState(initialRows);
  const [loadedKey, setLoadedKey] = useState<string | null>(initialError ? null : initialKey);
  const [loadedAt, setLoadedAt] = useState(() => new Date());
  const [error, setError] = useState<ErrorStateFromError | null>(initialError);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (key: string, params: { clubTypeId: number; ecclesiasticalYearId: number; localFieldId: number }) => {
      const id = ++requestId.current;
      setIsLoading(true);
      try {
        const result = await listAnnualRankingsFromClient(params);
        if (id !== requestId.current) return;
        setRows(Array.isArray(result) ? result : []);
        setLoadedKey(key);
        setLoadedAt(new Date());
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(errorStateFromError(err));
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [],
  );

  const reload = useCallback(() => {
    if (localFieldId === undefined) return Promise.resolve();
    return load(filterKey, { clubTypeId, ecclesiasticalYearId: yearId, localFieldId });
  }, [load, filterKey, clubTypeId, yearId, localFieldId]);

  // The server rendered the first filters (or their error); reload only when they change.
  const lastAttemptKey = useRef(initialKey);
  useEffect(() => {
    if (localFieldId === undefined || filterKey === lastAttemptKey.current) return;
    lastAttemptKey.current = filterKey;
    setPage(1);
    void load(filterKey, { clubTypeId, ecclesiasticalYearId: yearId, localFieldId });
  }, [filterKey, localFieldId, clubTypeId, yearId, load]);

  const rowsMatchFilters = loadedKey === filterKey;
  const sorted = useMemo(() => sortByProgress(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const pageRows = paginate(sorted, Math.min(page, totalPages), limit);
  const showRows = rowsMatchFilters && sorted.length > 0;
  const showStale = error !== null && showRows;
  const showErrorRow = error !== null && !showRows;
  const showEmpty = error === null && rowsMatchFilters && sorted.length === 0 && !isLoading;

  const year = ecclesiasticalYears.find((y) => y.ecclesiastical_year_id === yearId);
  const yearName = year?.name ?? String(yearId);
  const maxPoints = commonMaxPoints(rows);
  const description =
    maxPoints !== null
      ? t("descriptionMax", { year: yearName, max: formatNumber(maxPoints) })
      : t("description", { year: yearName });

  async function confirmRecalculate() {
    try {
      const outcome = readRecalculateOutcome(await recalculateRankings(yearId));
      switch (outcome.kind) {
        case "queued":
          toast.success(t("recalcResult.queued", { year: yearName }));
          break;
        case "skipped":
          toast.warning(t("recalcResult.skipped"));
          break;
        case "updated":
          toast.success(t("recalcResult.updated", { count: outcome.count }));
          break;
        default:
          toast.success(t("recalcResult.done"));
      }
    } catch (err) {
      throw new Error(err instanceof ApiError && err.message ? err.message : t("recalcDialog.failed"));
    }
    await reload();
  }

  const recalcButton = (
    <Button variant="outline" onClick={() => setRecalcOpen(true)} disabled={isLoading}>
      <RefreshCw aria-hidden />
      {t("recalc")}
    </Button>
  );

  const colCount = 5;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={description}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/annual-folders/ranking-config">
                <Settings aria-hidden />
                {t("settings")}
              </Link>
            </Button>
            {recalcButton}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {localFieldId !== undefined && (
          <ScopePicker
            allowAll={false}
            value={{
              id: String(localFieldId),
              name: localFields.find((f) => f.local_field_id === localFieldId)?.name ?? String(localFieldId),
            }}
            options={localFields.map((field) => ({ id: String(field.local_field_id), name: field.name }))}
            onChange={(id) => {
              if (id !== null) setRemembered(id);
            }}
            loading={isLoading}
          />
        )}
        <Segmented
          label={t("filters.clubType")}
          value={clubTypeId}
          onChange={setClubTypeId}
          options={clubTypes.map((type) => ({ value: type.club_type_id, label: type.name }))}
        />
        <Select value={String(yearId)} onValueChange={(value) => setYearId(Number(value))}>
          <SelectTrigger className="h-9 w-auto min-w-36" aria-label={t("filters.year")}>
            <SelectValue placeholder={t("filters.year")} />
          </SelectTrigger>
          <SelectContent>
            {ecclesiasticalYears.map((y) => (
              <SelectItem key={y.ecclesiastical_year_id} value={String(y.ecclesiastical_year_id)}>
                {y.name}
                {y.active ? ` ${t("filters.yearActive")}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showStale && <StaleDataNotice at={loadedAt} onRetry={() => void reload()} />}

      {showEmpty ? (
        <EmptyState icon={BarChart3} title={t("empty.title")} description={t("empty.description")}>
          {recalcButton}
        </EmptyState>
      ) : showErrorRow ? (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.club")}</TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("cols.points")}</TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.progress")}</TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.recognition")}</TableHead>
                <RowActionsHead className="h-9 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow
                colSpan={colCount}
                kind={error?.kind}
                detail={error?.detail}
                onRetry={() => void reload()}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : (
        <div aria-busy={isLoading} className={isLoading ? "opacity-60 transition-opacity" : undefined}>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.club")}</TableHead>
                  <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("cols.points")}</TableHead>
                  <TableHead className="h-9 w-56 px-3 text-xs font-medium text-muted-foreground">{t("cols.progress")}</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.recognition")}</TableHead>
                  <RowActionsHead className="h-9 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const href = breakdownHref(row, yearId);
                  return (
                    <TableRow key={row.club_enrollment_id}>
                      <TableCell className="px-3 py-2.5">
                        {href ? (
                          <Link prefetch={false} href={href} className="font-medium hover:underline">
                            {row.club_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.club_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(row.current_points)}
                        {maxPoints === null ? (
                          <span className="text-muted-foreground"> / {formatNumber(row.max_points)}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={row.progress_percentage} label={row.club_name} className="flex-1" />
                          <span className="w-14 shrink-0 text-right text-[13px] tabular-nums">
                            {formatNumber(clampPercent(row.progress_percentage), { maximumFractionDigits: 1 })}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RecognitionCell row={row} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RowActions
                          label={row.club_name}
                          actions={href ? [{ label: t("viewDetail"), icon: Eye, href }] : []}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <DataTableShell className="md:hidden">
            <ul aria-label={t("listLabel")} className="divide-y">
              {pageRows.map((row) => {
                const href = breakdownHref(row, yearId);
                const name = href ? (
                  <Link prefetch={false} href={href} className="font-medium hover:underline">
                    {row.club_name}
                  </Link>
                ) : (
                  <span className="font-medium">{row.club_name}</span>
                );
                return (
                  <li key={row.club_enrollment_id} className="space-y-1.5 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">{name}</span>
                      <span className="shrink-0 text-[13px] tabular-nums">
                        {formatNumber(clampPercent(row.progress_percentage), { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <ProgressBar value={row.progress_percentage} label={row.club_name} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatNumber(row.current_points)}
                        {maxPoints === null ? ` / ${formatNumber(row.max_points)}` : ""}
                      </span>
                      <RecognitionCell row={row} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </DataTableShell>

          {showRows ? (
            <div className="mt-3">
              <DataTablePagination
                page={Math.min(page, totalPages)}
                totalPages={totalPages}
                total={sorted.length}
                limit={limit}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={recalcOpen}
        onOpenChange={setRecalcOpen}
        title={t("recalcDialog.title", { year: yearName })}
        description={t("recalcDialog.description", { year: yearName })}
        confirmLabel={t("recalcDialog.confirm", { year: yearName })}
        onConfirm={confirmRecalculate}
      />
    </div>
  );
}
