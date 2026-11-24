"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarOff, CheckCircle2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { PageHeader } from "@/components/shared/page-header";
import { apiRequestFromClient } from "@/lib/api/client";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { closeYear, getYearEndPreview } from "@/lib/api/year-end";
import type { YearEndCloseResult, YearEndPreview } from "@/lib/api/year-end";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatDateTime } from "@/lib/format-locale";
import { findActiveYear, type ActiveYear } from "@/lib/year-end/active-year";
import { groupImpactByClub, paginate } from "@/lib/year-end/impact";

interface YearEndClientPageProps {
  ecclesiasticalYears: EcclesiasticalYear[];
}

type ClosedState = {
  yearName: string;
  result: YearEndCloseResult;
  closedAt: Date;
  /** `undefined` while looking it up, `null` when no year is active. */
  nextYear: ActiveYear | null | undefined;
};

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const PAGE_SIZES = [10, 20, 50];

export function YearEndClientPage({ ecclesiasticalYears }: YearEndClientPageProps) {
  const t = useTranslations("evaluation.certYear.yearEnd");
  const tPage = useTranslations("year_end.page");
  const formatDateTime = useFormatDateTime();
  const { canViewScreen } = useScreenAccess();
  // Only the active year can be closed (the backend rejects any other).
  const activeYear = ecclesiasticalYears.find((year) => year.active) ?? null;
  const yearId = activeYear?.ecclesiastical_year_id ?? null;
  const yearName = activeYear ? (activeYear.name ?? String(activeYear.ecclesiastical_year_id)) : "";
  // Closing is irreversible: same gate as the screen (ecclesiastical_years:update + admin).
  const canClose = canViewScreen("year-end");

  const [preview, setPreview] = useState<YearEndPreview | null>(null);
  const [loadFailure, setLoadFailure] = useState<ErrorStateFromError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closed, setClosed] = useState<ClosedState | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0] ?? 10);

  // The impact loads on open (no "preview" button).
  useEffect(() => {
    if (yearId === null || closed) return;
    let cancelled = false;
    getYearEndPreview(yearId)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadFailure(errorStateFromError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [yearId, attempt, closed]);

  const loading = yearId !== null && !closed && preview === null && loadFailure === null;
  const clubs = useMemo(() => groupImpactByClub(preview?.enrollmentDetails ?? []), [preview]);
  const pageData = paginate(clubs, page, limit);

  const handleClose = useCallback(async () => {
    if (yearId === null) return;
    let result: YearEndCloseResult;
    try {
      result = await closeYear(yearId);
    } catch (error) {
      // Rethrown so the dialog stays open and shows the message inline.
      throw new Error(error instanceof Error && error.message ? error.message : t("closeFailed"));
    }
    const closedAt = new Date();
    setClosed({ yearName, result, closedAt, nextYear: undefined });
    try {
      const years = await apiRequestFromClient<unknown>("/catalogs/ecclesiastical-years");
      setClosed((current) => (current ? { ...current, nextYear: findActiveYear(years) } : current));
    } catch {
      setClosed((current) => (current ? { ...current, nextYear: null } : current));
    }
  }, [yearId, yearName, t]);

  if (closed) {
    const { result } = closed;
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("doneTitle", { year: closed.yearName })}
          description={t("doneClosedAt", { date: formatDateTime(closed.closedAt) })}
        />
        <div
          role="status"
          className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold">
                {closed.nextYear === undefined
                  ? t("doneLookingUp")
                  : closed.nextYear
                    ? t("doneNewActive", { year: closed.nextYear.name })
                    : t("doneNoActive")}
              </p>
              <p className="text-[13px] text-muted-foreground tabular-nums">
                {t("doneSummary", {
                  enrollments: result.enrollmentsClosed,
                  folders: result.foldersClosed,
                  reports: result.reportsGenerated,
                  investiture: result.investiturePendingClosed,
                })}
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!activeYear) {
    return (
      <div className="space-y-6">
        <PageHeader title={tPage("title")} description={tPage("description")} />
        <EmptyState
          icon={CalendarOff}
          title={tPage("noActiveYearTitle")}
          description={tPage("noActiveYearDescription")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title", { year: yearName })}
        description={t("description")}
        actions={
          canClose ? (
            <Button
              type="button"
              variant="destructive-solid"
              disabled={loading || preview === null}
              onClick={() => setConfirmOpen(true)}
            >
              {t("closeButton", { year: yearName })}
            </Button>
          ) : undefined
        }
      />

      {loadFailure ? (
        <ErrorState
          kind={loadFailure.kind}
          detail={loadFailure.detail}
          title={t("loadFailedTitle")}
          onRetry={() => {
            setLoadFailure(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <>
          <KpiStrip aria-label={t("kpiLabel")}>
            <KpiStripItem
              label={t("kpiEnrollments")}
              value={preview ? preview.enrollmentsToClose : "—"}
              subline={t("kpiEnrollmentsSub")}
              emphasis
            />
            <KpiStripItem
              label={t("kpiFolders")}
              value={preview ? preview.foldersToClose : "—"}
              subline={t("kpiFoldersSub")}
            />
            <KpiStripItem
              label={t("kpiReports")}
              value={preview ? preview.reportsToGenerate : "—"}
              subline={t("kpiReportsSub")}
            />
            <KpiStripItem
              label={t("kpiInvestiture")}
              value="—"
              subline={t("kpiInvestitureSub")}
            />
          </KpiStrip>

          {preview && clubs.length === 0 ? (
            <EmptyState icon={Search} title={t("noClubsTitle")} description={t("noClubsDescription")} />
          ) : (
            <div className="space-y-3" aria-busy={loading}>
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={HEAD}>{t("colClub")}</TableHead>
                      <TableHead className={HEAD}>{t("colType")}</TableHead>
                      <TableHead className={`${HEAD} text-right`}>{t("colEnrollments")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!preview
                      ? [0, 1, 2].map((row) => (
                          <TableRow key={`skeleton-${row}`}>
                            <TableCell colSpan={3} className="px-3 py-2.5">
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                    {pageData.items.map((club) => (
                      <TableRow key={club.clubName} className="hover:bg-muted/30">
                        <TableCell className="px-3 py-2.5 font-medium">{club.clubName}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                          {club.clubTypes.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right text-sm tabular-nums">
                          {club.enrollments}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
              {preview ? (
                <DataTablePagination
                  page={pageData.page}
                  totalPages={pageData.totalPages}
                  total={pageData.total}
                  limit={limit}
                  limitOptions={PAGE_SIZES}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              ) : null}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="destructive"
        title={t("confirmTitle", { year: yearName })}
        description={t("confirmDescription", {
          enrollments: preview?.enrollmentsToClose ?? 0,
          folders: preview?.foldersToClose ?? 0,
          reports: preview?.reportsToGenerate ?? 0,
        })}
        typedConfirmation={yearName}
        typedConfirmationLabel={t("confirmTyped", { year: yearName })}
        confirmLabel={t("confirmButton", { year: yearName })}
        onConfirm={handleClose}
      />
    </div>
  );
}
