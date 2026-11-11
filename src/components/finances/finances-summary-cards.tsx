"use client";

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      {[0, 1, 2, 3].map((i) => (
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

  const netPositive = summary.net >= 0;

  return (
    <div className="space-y-2">
      {summary.period_closed ? (
        <div
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Badge variant="soft-warning">
            <Lock aria-hidden="true" data-icon="inline-start" />
            {t("closed.badge")}
          </Badge>
          <span>{t("closed.summaryNotice")}</span>
        </div>
      ) : null}

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
          label={t("summary.net")}
          value={formatAmount(summary.net)}
          valueClassName={netPositive ? undefined : "text-destructive"}
          subline={
            summary.movement_count === 1
              ? t("summary.movementsCount", { count: summary.movement_count })
              : t("summary.movementsCountPlural", { count: summary.movement_count })
          }
        />
        <KpiStripItem
          label={t("summary.balance")}
          value={formatAmount(summary.balance)}
          valueClassName={isPositiveBalance ? undefined : "text-destructive"}
          subline={t("summary.balanceHint")}
          emphasis
        />
      </KpiStrip>

      <p className="text-xs text-muted-foreground tabular-nums">
        {t("summary.inYear", {
          income: formatAmount(summary.year_income),
          expense: formatAmount(summary.year_expenses),
        })}
      </p>
    </div>
  );
}
