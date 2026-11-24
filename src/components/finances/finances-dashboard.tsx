"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown, Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import {
  FinancesSummaryCards,
  FinancesSummaryCardsSkeleton,
} from "@/components/finances/finances-summary-cards";
import {
  TransactionsTable,
  TransactionsTableSkeleton,
} from "@/components/finances/transactions-table";
import { FinancesByCategory } from "@/components/finances/finances-by-category";
import { FinancesExportButton } from "@/components/finances/finances-export-button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  listFinances,
  getFinanceSummary,
  type Finance,
  type FinanceSummary,
  type PaginatedFinances,
} from "@/lib/api/finances";
import type { DeleteTransactionDialogProps } from "@/components/finances/delete-transaction-dialog";
import type { FinanceEvidenceViewerDialogProps } from "@/components/finances/finance-evidence-viewer-dialog";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { FINANCES_CHANGED_EVENT } from "@/lib/finances/events";
import { getFinanceSectionLabel, type FinanceClubSection } from "@/lib/finances/club-sections";
import {
  FINANCE_MONTH_KEYS,
  buildPeriodOptions,
  formatSignedAmount,
  periodToValue,
  valueToPeriod,
  type FinancePeriod,
} from "@/lib/finances/period";
import { useFormatCurrency } from "@/lib/format-locale";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { cn } from "@/lib/utils";

const DeleteTransactionDialog = dynamic<DeleteTransactionDialogProps>(
  () =>
    import("@/components/finances/delete-transaction-dialog").then((m) => ({
      default: m.DeleteTransactionDialog,
    })),
  { ssr: false, loading: () => null },
);

const FinanceEvidenceViewerDialog = dynamic<FinanceEvidenceViewerDialogProps>(
  () =>
    import("@/components/finances/finance-evidence-viewer-dialog").then((m) => ({
      default: m.FinanceEvidenceViewerDialog,
    })),
  { ssr: false, loading: () => null },
);

const DEFAULT_PAGE_SIZE = 20;

interface FinancesDashboardProps {
  clubId: number;
  clubName: string;
  sections: FinanceClubSection[];
  sectionId: number | "all";
  /** «Por club / Consolidado» switcher (territory roles), shown under the title. */
  switcher?: ReactNode;
}

export function FinancesDashboard({
  clubId,
  clubName,
  sections,
  sectionId,
  switcher,
}: FinancesDashboardProps) {
  const t = useTranslations("finances");
  const tc = useTranslations("ops.club.finances");
  const formatCurrency = useFormatCurrency();
  const { canCapability } = useScreenAccess();
  const canCreate = canCapability("finances", "create");
  const canUpdate = canCapability("finances", "update");
  const canDelete = canCapability("finances", "delete");

  const periodOptions = useMemo(() => buildPeriodOptions(), []);
  const [period, setPeriod] = useState<FinancePeriod>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const { year, month } = period;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [reloadToken, setReloadToken] = useState(0);
  const transactionsRequest = useRef(0);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [result, setResult] = useState<PaginatedFinances | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFinance, setDeleteFinanceState] = useState<Finance | null>(null);
  const [evidenceFinance, setEvidenceFinance] = useState<Finance | null>(null);

  const selectedSectionId = sectionId === "all" ? undefined : sectionId;
  const key = `${clubId}|${year}|${month ?? "all"}|${selectedSectionId ?? "all"}|${page}|${limit}`;

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(false);
    try {
      setSummary(await getFinanceSummary(clubId, year, month, selectedSectionId));
    } catch {
      setSummary(null);
      setSummaryError(true);
    } finally {
      setLoadingSummary(false);
    }
  }, [clubId, year, month, selectedSectionId]);

  const fetchTransactions = useCallback(async () => {
    const requestId = ++transactionsRequest.current;
    setLoadingTable(true);
    setTableError(false);
    try {
      const data = await listFinances(clubId, {
        year,
        month,
        clubSectionId: selectedSectionId,
        page,
        limit,
      });
      if (requestId !== transactionsRequest.current) return;
      setResult(data);
      setLoadedKey(key);
      setLoadedAt(new Date());
    } catch {
      if (requestId !== transactionsRequest.current) return;
      setTableError(true);
    } finally {
      if (requestId === transactionsRequest.current) setLoadingTable(false);
    }
  }, [clubId, year, month, selectedSectionId, page, limit, key]);

  const refresh = useCallback(() => {
    void fetchSummary();
    void fetchTransactions();
    setReloadToken((token) => token + 1);
  }, [fetchSummary, fetchTransactions]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [clubId, year, month, selectedSectionId]);

  // The route modal announces saved movements; the list loads client-side.
  useEffect(() => {
    window.addEventListener(FINANCES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FINANCES_CHANGED_EVENT, refresh);
  }, [refresh]);

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [section.club_section_id, getFinanceSectionLabel(section)]),
      ),
    [sections],
  );

  const periodLabel = (p: FinancePeriod) => {
    const monthKey = p.month ? FINANCE_MONTH_KEYS[p.month - 1] : undefined;
    return monthKey ? `${t(`months.${monthKey}`)} ${p.year}` : tc("periodWholeYear", { year: p.year });
  };
  const money = (abs: number) => formatFinanceAmount(abs, formatCurrency);

  const description = summary
    ? tc(month ? "description.month" : "description.year", {
        period: month ? periodLabel(period) : String(year),
        net: formatSignedAmount(summary.net, money),
        balance: money(summary.balance),
      })
    : tc("description.loading", { club: clubName });

  const newHref = `/dashboard/finances/new?${new URLSearchParams({
    club: String(clubId),
    ...(selectedSectionId ? { section: String(selectedSectionId) } : {}),
  }).toString()}`;
  const editHref = (finance: Finance) =>
    `/dashboard/finances/${finance.finance_id}/edit?${new URLSearchParams({
      club: String(clubId),
      section: String(finance.club_section_id),
    }).toString()}`;

  const periodClosed = summary?.period_closed === true;
  const staleTable = tableError && result !== null && loadedKey === key;
  const failedTable = tableError && !staleTable;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={description}
        actions={
          <>
            <FinancesExportButton
              clubId={clubId}
              year={year}
              month={month}
              clubSectionId={selectedSectionId}
            />
            {canCreate ? (
              <Button asChild size="sm" className="h-9">
                <Link href={newHref}>
                  <Plus className="size-4" aria-hidden />
                  {t("dashboard.newTransactionButton")}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {switcher}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={periodToValue(period)}
          onValueChange={(value) => {
            const next = valueToPeriod(value);
            if (next) setPeriod(next);
          }}
        >
          <SelectTrigger className="h-9 w-[200px]" aria-label={tc("periodLabel")}>
            <SelectValue placeholder={tc("periodLabel")} />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={periodToValue(option)} value={periodToValue(option)}>
                {periodLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {periodClosed ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground"
        >
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{tc("closedNotice", { period: periodLabel(period) })}</p>
        </div>
      ) : null}

      {loadingSummary && !summary ? (
        <FinancesSummaryCardsSkeleton />
      ) : summaryError ? (
        <ErrorState
          variant="inline"
          description={t("dashboard.summaryLoadError")}
          onRetry={() => void fetchSummary()}
        />
      ) : summary ? (
        <FinancesSummaryCards summary={summary} />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <h2 className="text-base font-semibold">{t("dashboard.transactionsTitle")}</h2>
          {staleTable && loadedAt ? (
            <StaleDataNotice at={loadedAt} onRetry={() => void fetchTransactions()} />
          ) : null}
          {failedTable ? (
            <DataTableShell>
              <ErrorState
                variant="inline"
                description={t("dashboard.transactionsLoadError")}
                onRetry={() => void fetchTransactions()}
              />
            </DataTableShell>
          ) : loadingTable && !result ? (
            <TransactionsTableSkeleton />
          ) : (
            <div aria-busy={loadingTable} className={cn(loadingTable && "opacity-70")}>
              <TransactionsTable
                items={result?.data ?? []}
                sectionLabels={sectionLabels}
                editHref={canUpdate ? editHref : undefined}
                onDelete={
                  canDelete
                    ? (finance) => {
                        setDeleteFinanceState(finance);
                        setDeleteOpen(true);
                      }
                    : undefined
                }
                onViewEvidence={setEvidenceFinance}
                markClosed={!periodClosed}
                showSection={sections.length > 1 && sectionId === "all"}
              />
              {result && result.total > 0 ? (
                <div className="mt-3">
                  <DataTablePagination
                    page={result.page}
                    totalPages={Math.max(1, Math.ceil(result.total / limit))}
                    total={result.total}
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
        </div>

        <aside className="min-w-0 space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between lg:hidden"
            aria-expanded={railOpen}
            onClick={() => setRailOpen((open) => !open)}
          >
            {t("byCategory.title")}
            <ChevronDown className={cn("size-4 transition-transform", railOpen && "rotate-180")} aria-hidden />
          </Button>
          <div className={cn(railOpen ? "block" : "hidden", "lg:block")}>
            <FinancesByCategory
              clubId={clubId}
              year={year}
              month={month}
              clubSectionId={selectedSectionId}
              reloadToken={reloadToken}
            />
          </div>
        </aside>
      </div>

      <DeleteTransactionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        finance={deleteFinance}
        onSuccess={refresh}
      />

      <FinanceEvidenceViewerDialog
        finance={evidenceFinance}
        onOpenChange={(open) => {
          if (!open) setEvidenceFinance(null);
        }}
      />
    </div>
  );
}
