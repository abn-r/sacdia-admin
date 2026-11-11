"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { TransactionFormDialogProps, ClubSection } from "@/components/finances/transaction-form-dialog";
import type { DeleteTransactionDialogProps } from "@/components/finances/delete-transaction-dialog";
import type { FinanceEvidenceViewerDialogProps } from "@/components/finances/finance-evidence-viewer-dialog";
import { useTranslations } from "next-intl";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";

// ─── Deferred dialogs (dialog-gated — zod bundle only loaded on first open) ───

const TransactionFormDialog = dynamic<TransactionFormDialogProps>(
  () =>
    import("@/components/finances/transaction-form-dialog").then((m) => ({
      default: m.TransactionFormDialog,
    })),
  { ssr: false, loading: () => null },
);

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

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_KEYS = [
  { value: 1, key: "january" },
  { value: 2, key: "february" },
  { value: 3, key: "march" },
  { value: 4, key: "april" },
  { value: 5, key: "may" },
  { value: 6, key: "june" },
  { value: 7, key: "july" },
  { value: 8, key: "august" },
  { value: 9, key: "september" },
  { value: 10, key: "october" },
  { value: 11, key: "november" },
  { value: 12, key: "december" },
] as const;

const currentYear = new Date().getFullYear();
const DEFAULT_PAGE_SIZE = 20;
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancesDashboardProps {
  clubId: number;
  clubName: string;
  sections: ClubSection[];
  sectionId: number | "all";
  renderLayout?: (parts: {
    toolbar: ReactNode;
    body: ReactNode;
  }) => ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancesDashboard({
  clubId,
  sections,
  sectionId,
  renderLayout,
}: FinancesDashboardProps) {
  const t = useTranslations("finances");
  const { canCapability } = useScreenAccess();
  const canCreate = canCapability("finances", "create");
  const canUpdate = canCapability("finances", "update");
  const canDelete = canCapability("finances", "delete");

  // Filters
  const [year, setYear] = useState<number | undefined>(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);

  // Pagination (server-side)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  // Bumped after every refresh so the by-category block reloads too.
  const [reloadToken, setReloadToken] = useState(0);
  const transactionsRequest = useRef(0);

  // Data
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [result, setResult] = useState<PaginatedFinances | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [tableError, setTableError] = useState(false);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editFinance, setEditFinance] = useState<Finance | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFinance, setDeleteFinanceState] = useState<Finance | null>(null);
  const [evidenceFinance, setEvidenceFinance] = useState<Finance | null>(null);

  const formSections =
    sectionId === "all"
      ? sections
      : sections.filter((section) => section.club_section_id === sectionId);

  const selectedSectionId = sectionId === "all" ? undefined : sectionId;

  // Fetch summary (the backend scopes it to the section when one is selected)
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

  // Fetch one page of movements; year, month and section are server-side filters.
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
      // A newer request (filter or page change) superseded this one.
      if (requestId !== transactionsRequest.current) return;
      setResult(data);
    } catch {
      if (requestId !== transactionsRequest.current) return;
      setResult(null);
      setTableError(true);
    } finally {
      if (requestId === transactionsRequest.current) setLoadingTable(false);
    }
  }, [clubId, year, month, selectedSectionId, page, limit]);

  // Refresh summary, page and category breakdown (after a mutation or on demand)
  const refresh = useCallback(() => {
    fetchSummary();
    fetchTransactions();
    setReloadToken((token) => token + 1);
  }, [fetchSummary, fetchTransactions]);

  // Summary reloads only when its own filters change; the table also on paging.
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Any filter change goes back to the first page.
  useEffect(() => {
    setPage(1);
  }, [clubId, year, month, selectedSectionId]);

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [
          section.club_section_id,
          getFinanceSectionLabel(section),
        ]),
      ),
    [sections],
  );

  // Handlers
  function handleEdit(finance: Finance) {
    setEditFinance(finance);
    setFormOpen(true);
  }

  function handleDelete(finance: Finance) {
    setDeleteFinanceState(finance);
    setDeleteOpen(true);
  }

  function handleNewTransaction() {
    setEditFinance(null);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditFinance(null);
  }

  const toolbar = (
    <>
      <div
        className="hidden h-9 w-px shrink-0 self-end bg-border sm:block"
        aria-hidden
      />

      <div className="flex items-center gap-1.5 self-end pb-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-4" />
        <span>{t("dashboard.filtersLabel")}</span>
      </div>

      <Select
        value={year?.toString() ?? "all"}
        onValueChange={(v) => setYear(v === "all" ? undefined : Number(v))}
      >
        <SelectTrigger className="h-9 w-[110px]">
          <SelectValue placeholder={t("form.yearPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dashboard.allYears")}</SelectItem>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={month?.toString() ?? "all"}
        onValueChange={(v) => setMonth(v === "all" ? undefined : Number(v))}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("form.monthPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dashboard.allMonths")}</SelectItem>
          {MONTH_KEYS.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {t(`months.${m.key}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2 self-end">
        <FinancesExportButton
          clubId={clubId}
          year={year}
          month={month}
          clubSectionId={selectedSectionId}
        />

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={refresh}
          disabled={loadingSummary || loadingTable}
        >
          <RefreshCw
            className={`size-4 ${loadingSummary || loadingTable ? "animate-spin" : ""}`}
          />
          {t("dashboard.refreshButton")}
        </Button>

        {canCreate ? (
          <Button size="sm" className="h-9" onClick={handleNewTransaction}>
            <Plus className="size-4" />
            {t("dashboard.newTransactionButton")}
          </Button>
        ) : null}
      </div>
    </>
  );

  const body = (
    <>
      {loadingSummary ? (
        <FinancesSummaryCardsSkeleton />
      ) : summaryError ? (
        <EndpointErrorBanner
          state="missing"
          detail={t("dashboard.summaryLoadError")}
          onRetry={fetchSummary}
        />
      ) : summary ? (
        <FinancesSummaryCards summary={summary} />
      ) : null}

      <FinancesByCategory
        clubId={clubId}
        year={year}
        month={month}
        clubSectionId={selectedSectionId}
        reloadToken={reloadToken}
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">{t("dashboard.transactionsTitle")}</h2>
        {loadingTable ? (
          <TransactionsTableSkeleton />
        ) : tableError ? (
          <EndpointErrorBanner
            state="missing"
            detail={t("dashboard.transactionsLoadError")}
            onRetry={fetchTransactions}
          />
        ) : (
          <>
            <TransactionsTable
              items={result?.data ?? []}
              sectionLabels={sectionLabels}
              onEdit={canUpdate ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              onViewEvidence={setEvidenceFinance}
            />
            {result && result.total > 0 ? (
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
            ) : null}
          </>
        )}
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        clubId={clubId}
        sections={formSections}
        finance={editFinance}
        periodClosedHint={summary?.period_closed === true}
        onSuccess={refresh}
      />

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
    </>
  );

  if (renderLayout) {
    return renderLayout({ toolbar, body });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">{toolbar}</div>
      <div className="space-y-6">{body}</div>
    </div>
  );
}
