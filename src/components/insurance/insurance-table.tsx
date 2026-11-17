"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import type {
  InsuranceOverviewPerson,
  InsurancePersonStatus,
} from "@/lib/api/insurance";
import { useFormatDate } from "@/lib/format-locale";

const STATUS_INTENT: Record<InsurancePersonStatus, StatusIntent> = {
  covered: "success",
  in_order: "info",
  in_review: "warning",
  proof_rejected: "destructive",
  uninsured: "neutral",
};

interface InsuranceTableProps {
  people: InsuranceOverviewPerson[];
  /** Show the folio as a link to the payment order detail. */
  canOpenPaymentOrders?: boolean;
}

export function InsuranceTable({
  people,
  canOpenPaymentOrders = false,
}: InsuranceTableProps) {
  const t = useTranslations("insurance");
  const formatDateLocale = useFormatDate();

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    [people],
  );

  function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    try {
      return formatDateLocale(value, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  function origin(person: InsuranceOverviewPerson): string {
    const coverage = person.coverage;
    if (!coverage) return "—";
    if (coverage.source === "reassigned") {
      return t("table.origin_reassigned", {
        name: coverage.reassigned_from_name ?? t("table.unknown"),
      });
    }
    const place = [coverage.paid_in_section_name, coverage.paid_in_club_name]
      .filter(Boolean)
      .join(" · ");
    if (coverage.source === "paid_elsewhere") {
      return place
        ? t("table.origin_paid_elsewhere", { place })
        : t("table.origin_paid_elsewhere_unknown");
    }
    return t("table.origin_paid_here");
  }

  function folio(person: InsuranceOverviewPerson) {
    const order = person.active_order;
    if (order) {
      return canOpenPaymentOrders ? (
        <Link
          href={`/dashboard/payment-orders?orderId=${order.order_id}`}
          className="font-medium tabular-nums underline underline-offset-4 transition-colors duration-150 hover:text-primary"
        >
          {order.folio}
        </Link>
      ) : (
        <span className="tabular-nums">{order.folio}</span>
      );
    }
    const approved = person.coverage?.order_folio;
    return approved ? (
      <span className="tabular-nums text-muted-foreground">{approved}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }

  function personCell(person: InsuranceOverviewPerson) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{person.name || t("table.no_name")}</span>
          {person.is_staff ? (
            <Badge variant="secondary">{t("table.staff")}</Badge>
          ) : null}
        </div>
        {person.role_label ? (
          <p className="text-xs text-muted-foreground">{person.role_label}</p>
        ) : null}
      </div>
    );
  }

  function statusBadge(person: InsuranceOverviewPerson) {
    const label = t(`table.status_${person.status}`);
    return (
      <div className="space-y-0.5">
        <StatusBadge intent={STATUS_INTENT[person.status]} label={label} size="sm" />
        {person.status === "covered" && person.coverage?.valid_until ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("table.valid_until", { date: formatDate(person.coverage.valid_until) })}
          </p>
        ) : null}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("table.empty_title")}
        description={t("table.empty_description")}
      />
    );
  }

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("table.col_person")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("table.col_status")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("table.col_origin")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("table.col_folio")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((person) => (
              <TableRow key={person.user_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle">
                  {personCell(person)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  {statusBadge(person)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {origin(person)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm">
                  {folio(person)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul className="divide-y" aria-label={t("table.list_label")}>
          {sorted.map((person) => (
            <li key={person.user_id} className="space-y-1.5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                {personCell(person)}
                <span className="shrink-0">{statusBadge(person)}</span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {origin(person)}
                {person.active_order || person.coverage?.order_folio ? " · " : ""}
                {person.active_order || person.coverage?.order_folio
                  ? folio(person)
                  : null}
              </p>
            </li>
          ))}
        </ul>
      </DataTableShell>
    </>
  );
}
