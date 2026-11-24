"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { type StatusIntent } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { RowActions } from "@/components/shared/row-actions";
import { formatCentavos } from "@/components/payment-orders/format";
import { errorStateFromError } from "@/lib/api/error-state";
import type {
  PaymentOrder,
  PaymentOrderPurpose,
  PaymentOrderStatus,
} from "@/lib/api/field-payment-orders";
import {
  LONG_WAIT_DAYS,
  filterOrders,
  ordersForTab,
  paginate,
  sortOrdersForTab,
  waitStart,
  waitingDays,
  type PaymentOrderQueueTab,
} from "@/lib/payment-orders/queue";
import { cn } from "@/lib/utils";

/** Shared with the camporee payment-orders tab. */
export const ORDER_STATUS_INTENT: Record<PaymentOrderStatus, StatusIntent> = {
  ISSUED: "info",
  PROOF_SUBMITTED: "warning",
  APPROVED: "success",
  PROOF_REJECTED: "destructive",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface PaymentOrdersQueueProps {
  orders: PaymentOrder[];
  tab: PaymentOrderQueueTab;
  proofDates: ReadonlyMap<string, string>;
  /** Set when this tab cannot show data: render the error, never an empty list. */
  error?: unknown;
  onRetry: () => void;
  onOpen: (orderId: string) => void;
}

export function PaymentOrdersQueue({
  orders,
  tab,
  proofDates,
  error,
  onRetry,
  onOpen,
}: PaymentOrdersQueueProps) {
  const t = useTranslations("payment_orders");
  const tq = useTranslations("ops.paymentOrders.queue");
  const [now] = useState(() => new Date());
  const [purpose, setPurpose] = useState<PaymentOrderPurpose | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0] ?? 20);

  const tabOrders = sortOrdersForTab(ordersForTab(orders, tab), tab, proofDates);
  const filtered = filterOrders(tabOrders, { purpose, search });
  const view = paginate(filtered, page, limit);
  const isFiltered = purpose !== "ALL" || search.trim() !== "";
  const showWait = tab !== "rejected";
  const showStatus = tab === "all";
  const columns = 5 + (showWait ? 1 : 0) + (showStatus ? 1 : 0);

  const waitDays = (order: PaymentOrder) =>
    waitingDays(
      waitStart(order, proofDates.get(order.field_payment_order_id)),
      now,
    );

  const waitText = (days: number | null) =>
    days === null ? "—" : tq("wait", { days });

  const statusLabels = {
    ISSUED: t("status.ISSUED"),
    PROOF_SUBMITTED: t("status.PROOF_SUBMITTED"),
    APPROVED: t("status.APPROVED"),
    PROOF_REJECTED: t("status.PROOF_REJECTED"),
    CANCELLED: t("status.CANCELLED"),
    EXPIRED: t("status.EXPIRED"),
  } satisfies Record<PaymentOrderStatus, string>;

  const openLabel = (order: PaymentOrder) =>
    order.status === "PROOF_SUBMITTED" ? t("tray.openDetail") : tq("view");

  const clearFilters = () => {
    setPurpose("ALL");
    setSearch("");
    setPage(1);
  };

  const renderBody = () => {
    if (error) {
      const state = errorStateFromError(error);
      return (
        <TableBody>
          <ErrorStateTableRow
            colSpan={columns}
            kind={state.kind}
            {...(state.detail ? { detail: state.detail } : {})}
            onRetry={onRetry}
          />
        </TableBody>
      );
    }
    return (
      <TableBody>
        {view.items.map((order) => {
          const days = waitDays(order);
          const long = days !== null && days >= LONG_WAIT_DAYS;
          return (
            <TableRow key={order.field_payment_order_id}>
              <TableCell>
                <button
                  type="button"
                  className="rounded-sm font-mono font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => onOpen(order.field_payment_order_id)}
                >
                  {order.folio_reference}
                </button>
              </TableCell>
              <TableCell>{t(`purpose.${order.purpose}`)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {order.lines?.length ?? "—"}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCentavos(order.total_centavos, order.currency)}
              </TableCell>
              {showWait ? (
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    long ? "font-medium text-warning" : "text-muted-foreground",
                  )}
                >
                  {waitText(days)}
                </TableCell>
              ) : null}
              {showStatus ? (
                <TableCell>
                  {order.status === "APPROVED" ? (
                    <span className="text-muted-foreground">
                      {statusLabels.APPROVED}
                    </span>
                  ) : (
                    <ExceptionStatus
                      value={order.status}
                      normal={["APPROVED"]}
                      labels={statusLabels}
                      intents={ORDER_STATUS_INTENT}
                    />
                  )}
                </TableCell>
              ) : null}
              <TableCell>
                <RowActions
                  label={order.folio_reference}
                  actions={[]}
                  primary={
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        order.status === "PROOF_SUBMITTED"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => onOpen(order.field_payment_order_id)}
                    >
                      {openLabel(order)}
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    );
  };

  const showEmpty = !error && view.total === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ListFilterField id="payment-orders-search" label={tq("search")}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="payment-orders-search"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={tq("searchPlaceholder")}
            />
          </div>
        </ListFilterField>
        <ListFilterField
          id="payment-orders-purpose-filter"
          label={t("tray.filterPurpose")}
        >
          <NativeSelect
            id="payment-orders-purpose-filter"
            className="w-full"
            value={purpose}
            onChange={(event) => {
              setPurpose(event.target.value as PaymentOrderPurpose | "ALL");
              setPage(1);
            }}
          >
            <option value="ALL">{t("purpose.ALL")}</option>
            <option value="INSURANCE">{t("purpose.INSURANCE")}</option>
            <option value="CAMPOREE">{t("purpose.CAMPOREE")}</option>
          </NativeSelect>
        </ListFilterField>
      </div>

      {showEmpty ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            variant="no-results"
            title={tq("noResultsTitle")}
            description={tq("noResultsDescription")}
          >
            <Button type="button" variant="outline" onClick={clearFilters}>
              {tq("clearFilters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={Inbox}
            title={tq(`empty.${tab}.title`)}
            description={tq(`empty.${tab}.description`)}
          />
        )
      ) : (
        <>
          <DataTableShell className={error ? undefined : "hidden md:block"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tray.colFolio")}</TableHead>
                  <TableHead>{t("tray.colPurpose")}</TableHead>
                  <TableHead className="text-right">
                    {t("tray.colBeneficiaries")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("tray.colTotal")}
                  </TableHead>
                  {showWait ? (
                    <TableHead className="text-right">
                      {tq("colWait")}
                    </TableHead>
                  ) : null}
                  {showStatus ? (
                    <TableHead>{t("tray.colStatus")}</TableHead>
                  ) : null}
                  <TableHead>
                    <span className="sr-only">{tq("colActions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              {renderBody()}
            </Table>
          </DataTableShell>

          {error ? null : (
            <ul className="divide-y md:hidden">
              {view.items.map((order) => {
                const days = waitDays(order);
                const long = days !== null && days >= LONG_WAIT_DAYS;
                return (
                  <li key={order.field_payment_order_id}>
                    <button
                      type="button"
                      className="w-full space-y-0.5 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      onClick={() => onOpen(order.field_payment_order_id)}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-mono font-medium">
                          {order.folio_reference}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCentavos(order.total_centavos, order.currency)}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                        <span>{t(`purpose.${order.purpose}`)}</span>
                        <span>
                          {tq("beneficiaries", {
                            count: order.lines?.length ?? 0,
                          })}
                        </span>
                        {showWait ? (
                          <span className={cn(long && "font-medium text-warning")}>
                            {waitText(days)}
                          </span>
                        ) : null}
                        {showStatus && order.status !== "APPROVED" ? (
                          <span>{statusLabels[order.status]}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error || view.total === 0 ? null : (
            <DataTablePagination
              page={view.page}
              totalPages={view.totalPages}
              total={view.total}
              limit={limit}
              limitOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
