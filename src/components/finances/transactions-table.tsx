"use client";

import { DollarSign, Image as ImageIcon, Lock, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isFinanceIncome, type Finance } from "@/lib/api/finances";
import { formatFinanceAmount } from "@/lib/finances/amount";
import { formatSignedAmount } from "@/lib/finances/period";
import { useFormatCurrency, useFormatDate } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";

export function TransactionsTableSkeleton() {
  return (
    <DataTableShell aria-busy="true">
      <ul className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-14" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </li>
        ))}
      </ul>
    </DataTableShell>
  );
}

interface TransactionsTableProps {
  items: Finance[];
  sectionLabels?: Record<number, string>;
  /** Edit opens the route modal; the href is built by the page that knows the club. */
  editHref?: (finance: Finance) => string;
  onDelete?: (finance: Finance) => void;
  onViewEvidence: (finance: Finance) => void;
  /**
   * Mark rows whose month is closed. Off when the whole view is one closed
   * month (the notice on top already says it): only the exception is marked.
   */
  markClosed?: boolean;
  /** Show the section next to the category (club with several sections). */
  showSection?: boolean;
}

export function TransactionsTable({
  items,
  sectionLabels,
  editHref,
  onDelete,
  onViewEvidence,
  markClosed = true,
  showSection = false,
}: TransactionsTableProps) {
  const t = useTranslations("finances");
  const tc = useTranslations("ops.club.finances.table");
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const money = (abs: number) => formatFinanceAmount(abs, formatCurrency);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title={t("table.emptyTitle")}
        description={t("table.emptyDescription")}
      />
    );
  }

  const dateText = (finance: Finance) =>
    formatDate(finance.finance_date, { day: "2-digit", month: "short" });

  const subline = (finance: Finance) =>
    [
      finance.finances_categories?.name ?? "—",
      showSection
        ? (sectionLabels?.[finance.club_section_id] ?? finance.club_types?.name)
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const title = (finance: Finance) =>
    finance.description ?? finance.finances_categories?.name ?? `#${finance.finance_id}`;

  const amount = (finance: Finance) => {
    const income = isFinanceIncome(finance);
    const signed = income ? Math.abs(finance.amount) : -Math.abs(finance.amount);
    return (
      <span className={cn("font-medium tabular-nums", income ? "text-success" : "text-foreground")}>
        {formatSignedAmount(signed, money)}
      </span>
    );
  };

  const receipts = (finance: Finance) => {
    const count = finance.evidences?.length ?? 0;
    if (count === 0) return null;
    return (
      <span
        className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground"
        aria-label={tc("receipts", { count })}
      >
        <ImageIcon className="size-3.5" aria-hidden />
        {count}
      </span>
    );
  };

  const closedMark = (finance: Finance) =>
    markClosed && finance.period_closed ? (
      <span
        className="inline-flex items-center text-muted-foreground"
        title={t("closed.rowTooltip")}
      >
        <Lock className="size-3.5" aria-hidden />
        <span className="sr-only">{t("closed.badge")}</span>
      </span>
    ) : null;

  const actions = (finance: Finance) => (
    <RowActions
      label={title(finance)}
      actions={[
        {
          label: t("table.actionViewEvidence"),
          icon: ImageIcon,
          onSelect: () => onViewEvidence(finance),
          hidden: (finance.evidences?.length ?? 0) === 0,
        },
        {
          label: t("table.actionEdit"),
          icon: Pencil,
          href: editHref?.(finance),
          hidden: !editHref,
        },
        {
          label: `${t("table.actionDelete")}…`,
          icon: Trash2,
          destructive: true,
          onSelect: () => onDelete?.(finance),
          hidden: !onDelete,
        },
      ]}
    />
  );

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>{t("table.colDate")}</TableHead>
              <TableHead className={HEAD}>{tc("colMovement")}</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>{t("table.colAmount")}</TableHead>
              <TableHead className={HEAD}>
                <span className="sr-only">{t("table.colEvidence")}</span>
              </TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((finance) => (
              <TableRow key={finance.finance_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-top text-sm tabular-nums text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    {dateText(finance)}
                    {closedMark(finance)}
                  </span>
                </TableCell>
                <TableCell className="max-w-md whitespace-normal px-3 py-2.5 align-top">
                  <span className="block text-sm">{title(finance)}</span>
                  <span className="block text-[13px] text-muted-foreground">{subline(finance)}</span>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right align-top text-sm">{amount(finance)}</TableCell>
                <TableCell className="px-3 py-2.5 align-top">{receipts(finance)}</TableCell>
                <TableCell className="px-3 py-2.5 align-top">{actions(finance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul className="divide-y" aria-label={tc("listLabel")}>
          {items.map((finance) => (
            <li key={finance.finance_id} className="flex items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{title(finance)}</span>
                  <span className="shrink-0 text-sm">{amount(finance)}</span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] tabular-nums text-muted-foreground">
                  <span>{dateText(finance)}</span>
                  <span>{subline(finance)}</span>
                  {receipts(finance)}
                  {closedMark(finance)}
                </p>
              </div>
              {actions(finance)}
            </li>
          ))}
        </ul>
      </DataTableShell>
    </>
  );
}
