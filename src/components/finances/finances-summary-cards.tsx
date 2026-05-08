"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceSummary } from "@/lib/api/finances";
import { useFormatCurrency } from "@/lib/format-locale";
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

  function formatAmount(cents: number): string {
    return formatCurrency(cents / 100);
  }

  const movementsSub =
    summary.movement_count === 1
      ? t("summary.movementsCount", { count: summary.movement_count })
      : t("summary.movementsCountPlural", { count: summary.movement_count });

  const cards = [
    {
      label: t("summary.totalIncome"),
      value: formatAmount(summary.total_income),
      icon: TrendingUp,
      iconClass: "text-success",
      iconBg: "bg-success/10",
      valueClass: "text-success",
      sub: movementsSub,
    },
    {
      label: t("summary.totalExpense"),
      value: formatAmount(summary.total_expense),
      icon: TrendingDown,
      iconClass: "text-destructive",
      iconBg: "bg-destructive/10",
      valueClass: "text-destructive",
      sub: t("summary.inPeriod"),
    },
    {
      label: t("summary.balance"),
      value: formatAmount(summary.balance),
      icon: Wallet,
      iconClass: isPositiveBalance ? "text-primary" : "text-destructive",
      iconBg: isPositiveBalance ? "bg-primary/10" : "bg-destructive/10",
      valueClass: isPositiveBalance ? "text-foreground" : "text-destructive",
      sub: isPositiveBalance
        ? t("summary.positiveBalance")
        : t("summary.negativeBalance"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="group transition-all hover:border-primary/20">
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
