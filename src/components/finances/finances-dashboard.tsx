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
  type PaginatedFinances,
} from "@/lib/api/finances";
import type { ClubSection } from "@/components/finances/transaction-form-dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

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
  // Filters
  const [year, setYear] = useState<number | undefined>(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);

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
      const data = await listFinances(clubId, { year, month, limit: 50 });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoadingTable(false);
    }
  }, [clubId, year, month]);

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
          <span>Filtros:</span>
        </div>

        {/* Year filter */}
        <Select
          value={year?.toString() ?? "all"}
          onValueChange={(v) => setYear(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
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
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los meses</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
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
            Actualizar
          </Button>

          <Button size="sm" onClick={handleNewTransaction}>
            <Plus className="size-4" />
            Nuevo movimiento
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
        <h2 className="text-base font-semibold">Movimientos</h2>
        {loadingTable ? (
          <TransactionsTableSkeleton />
        ) : (
          <TransactionsTable
            items={result?.data ?? []}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* Pagination info */}
        {result && result.total > result.data.length && (
          <p className="text-sm text-muted-foreground">
            Mostrando {result.data.length} de {result.total} movimientos.
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
