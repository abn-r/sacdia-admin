"use client";

import Link from "next/link";
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
import type { InsuranceOverviewPerson, InsurancePersonStatus } from "@/lib/api/insurance";
import type { InsuranceTab } from "@/lib/insurance/tabs";
import { useFormatDate } from "@/lib/format-locale";

const STATUS_INTENT: Record<InsurancePersonStatus, StatusIntent> = {
  covered: "success",
  in_order: "info",
  in_review: "warning",
  proof_rejected: "destructive",
  uninsured: "neutral",
};

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";

interface InsuranceTableProps {
  /** People of the active tab (already filtered and sorted). */
  people: InsuranceOverviewPerson[];
  tab: InsuranceTab;
  /** Show the folio as a link to the payment order detail. */
  canOpenPaymentOrders?: boolean;
}

/**
 * The tab already says the status, so a status column only appears where it
 * varies: «En proceso» marks each person's step; «Con seguro» shows until when.
 */
export function InsuranceTable({ people, tab, canOpenPaymentOrders = false }: InsuranceTableProps) {
  const t = useTranslations("insurance");
  const tc = useTranslations("ops.club.insurance");
  const formatDateLocale = useFormatDate();

  function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    try {
      return formatDateLocale(value, { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return value;
    }
  }

  function origin(person: InsuranceOverviewPerson): string {
    const coverage = person.coverage;
    if (!coverage) return "—";
    if (coverage.source === "reassigned") {
      return t("table.origin_reassigned", { name: coverage.reassigned_from_name ?? t("table.unknown") });
    }
    const place = [coverage.paid_in_section_name, coverage.paid_in_club_name].filter(Boolean).join(" · ");
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
    return approved ? <span className="tabular-nums text-muted-foreground">{approved}</span> : null;
  }

  function personCell(person: InsuranceOverviewPerson) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{person.name || t("table.no_name")}</span>
          {person.is_staff ? <Badge variant="secondary">{t("table.staff")}</Badge> : null}
        </div>
        {person.role_label ? <p className="text-xs text-muted-foreground">{person.role_label}</p> : null}
      </div>
    );
  }

  function statusMark(person: InsuranceOverviewPerson) {
    if (tab === "in_process") {
      return (
        <StatusBadge intent={STATUS_INTENT[person.status]} label={t(`table.status_${person.status}`)} size="sm" />
      );
    }
    if (tab === "covered" && person.coverage?.valid_until) {
      return (
        <span className="text-sm tabular-nums text-muted-foreground">
          {t("table.valid_until", { date: formatDate(person.coverage.valid_until) })}
        </span>
      );
    }
    return null;
  }

  if (people.length === 0) {
    return <EmptyState icon={ShieldCheck} title={tc(`empty.${tab}.title`)} description={tc(`empty.${tab}.description`)} />;
  }

  const showStatus = tab !== "uninsured";
  const showOrigin = tab === "covered";
  const showFolio = tab !== "uninsured";

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>{t("table.col_person")}</TableHead>
              {showStatus ? (
                <TableHead className={HEAD}>{tab === "covered" ? tc("colValidity") : t("table.col_status")}</TableHead>
              ) : null}
              {showOrigin ? <TableHead className={HEAD}>{t("table.col_origin")}</TableHead> : null}
              {showFolio ? <TableHead className={HEAD}>{t("table.col_folio")}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.user_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle">{personCell(person)}</TableCell>
                {showStatus ? <TableCell className="px-3 py-2.5 align-middle">{statusMark(person)}</TableCell> : null}
                {showOrigin ? (
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {origin(person)}
                  </TableCell>
                ) : null}
                {showFolio ? <TableCell className="px-3 py-2.5 align-middle text-sm">{folio(person)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul className="divide-y" aria-label={t("table.list_label")}>
          {people.map((person) => {
            const secondLine = [tab === "covered" ? origin(person) : null].filter(Boolean).join(" · ");
            const orderFolio = folio(person);
            return (
              <li key={person.user_id} className="space-y-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  {personCell(person)}
                  <span className="shrink-0">{statusMark(person)}</span>
                </div>
                {secondLine || orderFolio ? (
                  <p className="text-[13px] text-muted-foreground">
                    {secondLine}
                    {secondLine && orderFolio ? " · " : ""}
                    {orderFolio}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </DataTableShell>
    </>
  );
}
