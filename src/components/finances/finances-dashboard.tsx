"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TransactionFormDialog } from "@/components/finances/transaction-form-dialog";
import { DeleteTransactionDialog } from "@/components/finances/delete-transaction-dialog";
import {
  listFinances,
  getFinanceSummary,
  type Finance,
  type FinanceSummary,
  type FinanceSortField,
  type PaginatedFinances,
} from "@/lib/api/finances";
import type { SortDirection } from "@/components/shared/sortable-header";
import type { ClubSection } from "@/components/finances/transaction-form-dialog";
import { useTranslations } from "next-intl";

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
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancesDashboardProps {
  clubId: number;
  clubName: string;
  sections: ClubSection[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancesDashboard({
  clubId,
  clubName,
  sections,
}: FinancesDashboardProps) {
  const t = useTranslations("finances");

  // Filters
  const [year, setYear] = useState<number | undefined>(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);

  // Sort
  const [sortField, setSortField] = useState<FinanceSortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Data
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [result, setResult] = useState<PaginatedFinances | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editFinance, setEditFinance] = useState<Finance | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFinance, setDeleteFinanceState] = useState<Finance | null>(null);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getFinanceSummary(clubId, year, month);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [clubId, year, month]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoadingTable(true);
    try {
      const data = await listFinances(clubId, {
        year,
        month,
        limit: 50,
        sortBy: sortField,
        sortOrder: sortDirection,
      });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoadingTable(false);
    }
  }, [clubId, year, month, sortField, sortDirection]);

  const handleSort = (field: FinanceSortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Refresh both on mount and filter change
  const refresh = useCallback(() => {
    fetchSummary();
    fetchTransactions();
  }, [fetchSummary, fetchTransactions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>{t("dashboard.filtersLabel")}</span>
        </div>

        {/* Year filter */}
        <Select
          value={year?.toString() ?? "all"}
          onValueChange={(v) => setYear(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-8 w-[110px]">
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

        {/* Month filter */}
        <Select
          value={month?.toString() ?? "all"}
          onValueChange={(v) => setMonth(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-8 w-[140px]">
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loadingSummary || loadingTable}
          >
            <RefreshCw
              className={`size-4 ${loadingSummary || loadingTable ? "animate-spin" : ""}`}
            />
            {t("dashboard.refreshButton")}
          </Button>

          <Button size="sm" onClick={handleNewTransaction}>
            <Plus className="size-4" />
            {t("dashboard.newTransactionButton")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {loadingSummary ? (
        <FinancesSummaryCardsSkeleton />
      ) : summary ? (
        <FinancesSummaryCards summary={summary} />
      ) : null}

      {/* Transactions table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">{t("dashboard.transactionsTitle")}</h2>
        {loadingTable ? (
          <TransactionsTableSkeleton />
        ) : (
          <TransactionsTable
            items={result?.data ?? []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}

        {/* Pagination info */}
        {result && result.total > result.data.length && (
          <p className="text-sm text-muted-foreground">
            {t("dashboard.showing", {
              shown: result.data.length,
              total: result.total,
            })}
          </p>
        )}
      </div>

      {/* Create/Edit dialog */}
      <TransactionFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        clubId={clubId}
        sections={sections}
        finance={editFinance}
        onSuccess={refresh}
      />

      {/* Delete dialog */}
      <DeleteTransactionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        finance={deleteFinance}
        onSuccess={refresh}
      />
    </div>
  );
}
