"use client";

import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import type { Finance, FinanceSortField } from "@/lib/api/finances";
import { formatCurrency } from "@/lib/currency";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(cents: number): string {
  return formatCurrency(cents / 100);
}

const MONTH_KEYS: Record<number, string> = {
  1: "january",
  2: "february",
  3: "march",
  4: "april",
  5: "may",
  6: "june",
  7: "july",
  8: "august",
  9: "september",
  10: "october",
  11: "november",
  12: "december",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TransactionsTableSkeleton() {
  const t = useTranslations("finances");

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            {[
              t("table.colDate"),
              t("table.colDescription"),
              t("table.colCategory"),
              t("table.colType"),
              t("table.colAmount"),
              "",
            ].map((h, i) => (
              <TableHead
                key={i}
                className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="size-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  items: Finance[];
  onEdit: (finance: Finance) => void;
  onDelete: (finance: Finance) => void;
  sortField: FinanceSortField;
  sortDirection: SortDirection;
  onSort: (field: FinanceSortField, direction: SortDirection) => void;
}

export function TransactionsTable({
  items,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: TransactionsTableProps) {
  const t = useTranslations("finances");
  const formatDate = useFormatDate();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title={t("table.emptyTitle")}
        description={t("table.emptyDescription")}
      />
    );
  }

  function monthName(month: number): string {
    const key = MONTH_KEYS[month];
    if (key) {
      return t(`months.${key}` as Parameters<typeof t>[0]);
    }
    return String(month);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="h-9 px-3"
              aria-sort={
                sortField === "date"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortableHeader
                field="date"
                activeField={sortField}
                direction={sortDirection}
                onSort={onSort}
              >
                {t("table.colDate")}
              </SortableHeader>
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.colDescription")}
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={
                sortField === "category"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortableHeader
                field="category"
                activeField={sortField}
                direction={sortDirection}
                onSort={onSort}
              >
                {t("table.colCategory")}
              </SortableHeader>
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.colPeriod")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("table.colType")}
            </TableHead>
            <TableHead
              className="h-9 px-3 text-right"
              aria-sort={
                sortField === "amount"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <SortableHeader
                field="amount"
                activeField={sortField}
                direction={sortDirection}
                onSort={onSort}
                align="right"
              >
                {t("table.colAmount")}
              </SortableHeader>
            </TableHead>
            <TableHead className="h-9 w-12 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((finance) => {
            const isIncome = finance.finances_categories?.type === 0;

            return (
              <TableRow key={finance.finance_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {formatDate(finance.finance_date, { day: "2-digit", month: "2-digit", year: "numeric" })}
                </TableCell>
                <TableCell className="max-w-xs px-3 py-2.5 align-middle">
                  <span className="truncate text-sm">
                    {finance.description ?? <span className="text-muted-foreground">—</span>}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="text-sm">
                    {finance.finances_categories?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground tabular-nums">
                  {monthName(finance.month)}/{finance.year}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant={isIncome ? "success" : "destructive"}>
                    {isIncome ? t("table.typeIncome") : t("table.typeExpense")}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatAmount(Math.abs(finance.amount))}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{t("table.actionsLabel")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(finance)}>
                        <Pencil className="size-4" />
                        {t("table.actionEdit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(finance)}
                      >
                        <Trash2 className="size-4" />
                        {t("table.actionDelete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
