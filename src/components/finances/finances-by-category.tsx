"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFinanceByCategory,
  type FinanceByCategory,
  type FinanceCategoryBreakdownItem,
} from "@/lib/api/finances";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { useFormatCurrency } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

interface FinancesByCategoryProps {
  clubId: number;
  /** Calendar year; without it the breakdown cannot be requested. */
  year: number | undefined;
  month?: number;
  clubSectionId?: number;
  /** Bump to reload after a movement changed. */
  reloadToken?: number;
}

export function FinancesByCategory({
  clubId,
  year,
  month,
  clubSectionId,
  reloadToken = 0,
}: FinancesByCategoryProps) {
  const t = useTranslations("finances.byCategory");
  const [data, setData] = useState<FinanceByCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!year) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setData(await getFinanceByCategory(clubId, year, month, clubSectionId));
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clubId, year, month, clubSectionId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  return (
    <section className="space-y-3" aria-labelledby="finances-by-category-title">
      <h2 id="finances-by-category-title" className="text-base font-semibold">
        {t("title")}
      </h2>

      {!year ? (
        <EmptyState icon={Layers} title={t("yearRequired")} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 rounded-xl bg-card p-4 shadow-card">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EndpointErrorBanner
          state="missing"
          detail={t("loadError")}
          onRetry={() => void load()}
        />
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryList
            title={t("incomeTitle")}
            items={data.income}
            total={data.totals.income}
            tone="income"
          />
          <CategoryList
            title={t("expenseTitle")}
            items={data.expenses}
            total={data.totals.expenses}
            tone="expense"
          />
        </div>
      ) : null}
    </section>
  );
}

function CategoryList({
  title,
  items,
  total,
  tone,
}: {
  title: string;
  items: FinanceCategoryBreakdownItem[];
  total: number;
  tone: "income" | "expense";
}) {
  const t = useTranslations("finances.byCategory");
  const formatCurrency = useFormatCurrency();
  const formatAmount = (value: number) => formatFinanceAmount(value, formatCurrency);
  const max = items.reduce((acc, item) => Math.max(acc, item.total), 0);

  return (
    <div
      className="space-y-3 rounded-xl bg-card p-4 shadow-card"
      data-testid={`by-category-${tone}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm tabular-nums text-muted-foreground">
          {t("total")}{" "}
          <span
            className={cn(
              "font-semibold",
              tone === "income" ? "text-success" : "text-foreground",
            )}
          >
            {formatAmount(total)}
          </span>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const width = max > 0 ? Math.max(2, (item.total / max) * 100) : 0;
            return (
              <li key={item.category_id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatAmount(item.total)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      tone === "income" ? "bg-success-solid" : "bg-foreground/60",
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("movements", { count: item.count })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
