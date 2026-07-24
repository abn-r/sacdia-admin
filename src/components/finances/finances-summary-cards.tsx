"use client";

import { TrendingUp, ArrowDown, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceSummary } from "@/lib/api/finances";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { useFormatCurrency } from "@/lib/format-locale";
import { PAGE_ENTER_CLASSES, STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function FinancesSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="size-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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

  const incomeCount = summary.income_count;
  const incomeSub =
    incomeCount === 1
      ? t("summary.incomeMovementsCount", { count: incomeCount })
      : incomeCount !== undefined
        ? t("summary.incomeMovementsCountPlural", { count: incomeCount })
        : t("summary.inPeriod");

  const expenseSub = t("summary.inPeriod");

  const cards = [
    {
      label: t("summary.totalIncome"),
      value: formatAmount(summary.total_income),
      icon: TrendingUp,
      iconClass: "text-success",
      iconBg: "bg-success/10",
      valueClass: "text-success",
      sub: incomeSub,
    },
    {
      label: t("summary.totalExpense"),
      value: formatAmount(summary.total_expense),
      icon: ArrowDown,
      iconClass: "text-destructive",
      iconBg: "bg-destructive/10",
      valueClass: "text-destructive",
      sub: expenseSub,
    },
    {
      label: t("summary.balance"),
      value: formatAmount(summary.balance),
      icon: Banknote,
      iconClass: isPositiveBalance ? "text-primary" : "text-destructive",
      iconBg: isPositiveBalance ? "bg-primary/10" : "bg-destructive/10",
      valueClass: isPositiveBalance ? "text-foreground" : "text-destructive",
      sub: isPositiveBalance
        ? t("summary.positiveBalance")
        : t("summary.negativeBalance"),
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", PAGE_ENTER_CLASSES)}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={cn(
              "group transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/20 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
              STAGGER_CLASSES,
            )}
            style={getStaggerStyle(index, 40)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${card.valueClass}`}>
                    {card.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{card.sub}</p>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`size-5 ${card.iconClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
