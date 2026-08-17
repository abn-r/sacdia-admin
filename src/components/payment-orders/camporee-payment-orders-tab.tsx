"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listPaymentOrders,
  type PaymentOrder,
} from "@/lib/api/field-payment-orders";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";
import { ORDER_STATUS_INTENT } from "@/components/payment-orders/payment-orders-tray";
import { PaymentOrderDetail } from "@/components/payment-orders/payment-order-detail";
import { formatCentavos } from "@/components/payment-orders/format";

export interface CamporeePaymentOrdersTabProps {
  camporeeId: number;
  /**
   * v1.1: union camporees also collect through the issuing local field
   * (opción A); the only difference is the backend filter used.
   */
  camporeeType?: "local" | "union";
}

/** Payment orders scoped to one camporee, local or union (plan base Task 3.4-admin). */
export function CamporeePaymentOrdersTab({
  camporeeId,
  camporeeType = "local",
}: CamporeePaymentOrdersTabProps) {
  const t = useTranslations("payment_orders");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(
        await listPaymentOrders({
          purpose: "CAMPOREE",
          ...(camporeeType === "union"
            ? { union_camporee_id: camporeeId }
            : { camporee_id: camporeeId }),
        }),
      );
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [camporeeId, camporeeType, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
        <EmptyState icon={Inbox} title={t("camporeeTab.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("tray.colFolio")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("tray.colBeneficiaries")}
                </th>
                <th className="px-3 py-2 font-medium">{t("tray.colTotal")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.field_payment_order_id} className="border-t">
                  <td className="px-3 py-2 font-mono">
                    {order.folio_reference}
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
