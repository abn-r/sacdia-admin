"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPaymentOrdersReviewQueue,
  listPaymentOrders,
  type PaymentOrder,
  type PaymentOrderPurpose,
  type PaymentOrderStatus,
} from "@/lib/api/field-payment-orders";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";
import { PaymentOrderDetail } from "@/components/payment-orders/payment-order-detail";
import { formatCentavos } from "@/components/payment-orders/format";

export const ORDER_STATUS_INTENT: Record<PaymentOrderStatus, StatusIntent> = {
  ISSUED: "info",
  PROOF_SUBMITTED: "warning",
  APPROVED: "success",
  PROOF_REJECTED: "destructive",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

type PurposeFilter = PaymentOrderPurpose | "ALL";
type StatusFilter = PaymentOrderStatus | "REVIEW_QUEUE";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PaymentOrdersTray() {
  const t = useTranslations("payment_orders");
  const [purpose, setPurpose] = useState<PurposeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("REVIEW_QUEUE");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const purposeFilter = purpose === "ALL" ? undefined : purpose;
      const data =
        status === "REVIEW_QUEUE"
          ? await getPaymentOrdersReviewQueue({ purpose: purposeFilter })
          : await listPaymentOrders({ purpose: purposeFilter, status });
      setOrders(data);
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [purpose, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="payment-orders-purpose-filter"
            className="text-muted-foreground text-sm"
          >
            {t("tray.filterPurpose")}
          </label>
          <select
            id="payment-orders-purpose-filter"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={purpose}
            onChange={(event) =>
              setPurpose(event.target.value as PurposeFilter)
            }
            aria-label={t("tray.filterPurpose")}
          >
            <option value="ALL">{t("purpose.ALL")}</option>
            <option value="INSURANCE">{t("purpose.INSURANCE")}</option>
            <option value="CAMPOREE">{t("purpose.CAMPOREE")}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="payment-orders-status-filter"
            className="text-muted-foreground text-sm"
          >
            {t("tray.filterStatus")}
          </label>
          <select
            id="payment-orders-status-filter"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            aria-label={t("tray.filterStatus")}
          >
            <option value="REVIEW_QUEUE">{t("tray.reviewQueue")}</option>
            <option value="ISSUED">{t("status.ISSUED")}</option>
            <option value="APPROVED">{t("status.APPROVED")}</option>
            <option value="PROOF_REJECTED">{t("status.PROOF_REJECTED")}</option>
            <option value="CANCELLED">{t("status.CANCELLED")}</option>
            <option value="EXPIRED">{t("status.EXPIRED")}</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("tray.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={Inbox} title={t("tray.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("tray.colFolio")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colPurpose")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("tray.colBeneficiaries")}
                </th>
                <th className="px-3 py-2 font-medium">{t("tray.colTotal")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colIssued")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.field_payment_order_id} className="border-t">
                  <td className="px-3 py-2 font-mono">
                    {order.folio_reference}
                  </td>
                  <td className="px-3 py-2">
                    {t(`purpose.${order.purpose}`)}
                  </td>
                  <td className="px-3 py-2">{order.lines?.length ?? "—"}</td>
                  <td className="px-3 py-2">
                    {formatCentavos(order.total_centavos, order.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={ORDER_STATUS_INTENT[order.status] ?? "neutral"}
                      label={t(`status.${order.status}`)}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setSelectedOrderId(order.field_payment_order_id)
                      }
                    >
                      {t("tray.openDetail")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaymentOrderDetail
        orderId={selectedOrderId}
        open={selectedOrderId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}
