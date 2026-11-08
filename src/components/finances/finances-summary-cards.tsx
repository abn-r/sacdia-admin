"use client";

import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceSummary } from "@/lib/api/finances";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { useFormatCurrency } from "@/lib/format-locale";
import { useTranslations } from "next-intl";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function FinancesSummaryCardsSkeleton() {
  return (
    <KpiStrip>
      {[0, 1, 2].map((i) => (
        <div key={i} role="listitem" className="space-y-2 px-4 py-3.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </KpiStrip>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FinancesSummaryCardsProps {
  summary: FinanceSummary;
}

export function FinancesSummaryCards({ summary }: FinancesSummaryCardsProps) {
  const t = useTranslations("finances");
  const formatCurrency = useFormatCurrency();
  const isPositiveBalance = summary.balance >= 0;

  const formatAmount = (amountInCentavos: number) =>
    formatFinanceAmount(amountInCentavos, formatCurrency);

  const incomeSub =
    summary.income_count === undefined
      ? t("summary.inPeriod")
      : summary.income_count === 1
        ? t("summary.incomeMovementsCount", { count: summary.income_count })
        : t("summary.incomeMovementsCountPlural", { count: summary.income_count });

  const expenseSub =
    summary.expense_count === undefined
      ? t("summary.inPeriod")
      : summary.expense_count === 1
        ? t("summary.expenseMovementsCount", { count: summary.expense_count })
        : t("summary.expenseMovementsCountPlural", { count: summary.expense_count });

  return (
    <KpiStrip aria-label={t("summary.balance")}>
      <KpiStripItem
        label={t("summary.totalIncome")}
        value={`+${formatAmount(summary.total_income)}`}
        valueClassName="text-success"
        subline={incomeSub}
      />
      <KpiStripItem
        label={t("summary.totalExpense")}
        value={`\u2212${formatAmount(summary.total_expense)}`}
        subline={expenseSub}
      />
      <KpiStripItem
        label={t("summary.balance")}
        value={formatAmount(summary.balance)}
        valueClassName={isPositiveBalance ? undefined : "text-destructive"}
        subline={isPositiveBalance ? t("summary.positiveBalance") : t("summary.negativeBalance")}
        emphasis
      />
    </KpiStrip>
  );
}
