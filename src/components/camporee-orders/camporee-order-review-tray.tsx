"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getCamporeeOrdersReviewQueue,
  type CamporeeOrder,
} from "@/lib/api/camporee-orders";
import { CamporeeOrderDetail } from "@/components/camporee-orders/camporee-order-detail";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";
import {
  formatCentavos,
  formatDate,
} from "@/components/camporee-orders/camporee-order-format";
import { CAMPOREE_ORDER_STATUS_INTENT } from "@/components/camporee-orders/camporee-order-status";

interface CamporeeOrderReviewTrayProps {
  initialOrderId?: string | null;
}

export function CamporeeOrderReviewTray({
  initialOrderId = null,
}: CamporeeOrderReviewTrayProps) {
  const t = useTranslations("camporee_orders");
  const [orders, setOrders] = useState<CamporeeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrderId,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await getCamporeeOrdersReviewQueue());
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t, "toasts.loadFailed"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [initialOrderId]);

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
        <EmptyState icon={Inbox} title={t("tray.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("tray.colFolio")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colLines")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colTotal")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colIssued")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.camporee_order_id} className="border-t">
                  <td className="px-3 py-2 font-mono">{order.folio_reference}</td>
                  <td className="px-3 py-2">{order.lines.length}</td>
                  <td className="px-3 py-2">
                    {formatCentavos(order.total_centavos, order.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={CAMPOREE_ORDER_STATUS_INTENT[order.status] ?? "neutral"}
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
                      onClick={() => setSelectedOrderId(order.camporee_order_id)}
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

      <CamporeeOrderDetail
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
