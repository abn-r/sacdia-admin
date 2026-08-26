"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listPendingPaymentObligations,
  paymentObligationDetailPath,
  paymentObligationActionOwner,
} from "@/lib/api/payment-obligations";
import type {
  PaymentObligation,
  PaymentObligationAction,
  PaymentObligationSource,
  PaymentObligationStatus,
} from "@/lib/types/payment-obligations";
import { formatCentavos } from "@/components/payment-orders/format";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";

const OBLIGATION_STATUS_INTENT: Record<PaymentObligationStatus, StatusIntent> = {
  PAYMENT_DUE: "warning",
  UNDER_REVIEW: "info",
  PROOF_REJECTED: "destructive",
  ORDER_REVIEW: "warning",
};

const SOURCE_LABEL_KEY = {
  CAMPOREE_ORDER: "source.CAMPOREE_ORDER",
  FIELD_PAYMENT_ORDER: "source.FIELD_PAYMENT_ORDER",
  MATERIAL_ORDER: "source.MATERIAL_ORDER",
} as const satisfies Record<PaymentObligationSource, `source.${PaymentObligationSource}`>;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export function PaymentObligationsClient() {
  const t = useTranslations("payment_obligations");
  const tCamporee = useTranslations("camporee_orders");
  const [items, setItems] = useState<PaymentObligation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPendingPaymentObligations());
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, tCamporee, "toasts.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tCamporee]);

  useEffect(() => {
    void load();
  }, [load]);

  const actionLabel = (action: PaymentObligationAction, source: PaymentObligationSource) => {
    const owner = paymentObligationActionOwner(source);
    return t(`actions.${owner}.${action}`);
  };

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
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={t("tray.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("tray.colFolio")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colSource")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colPurpose")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colTotal")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colCreated")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.source}-${item.source_id}`} className="border-t">
                  <td className="px-3 py-2 font-mono">{item.folio}</td>
                  <td className="px-3 py-2">{t(SOURCE_LABEL_KEY[item.source])}</td>
                  <td className="px-3 py-2">{t(`purpose.${item.purpose}`)}</td>
                  <td className="px-3 py-2">
                    {formatCentavos(item.total_centavos, item.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={OBLIGATION_STATUS_INTENT[item.status] ?? "neutral"}
                      label={t(`status.${item.status}`)}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" size="sm" variant="secondary" asChild>
                      <Link href={paymentObligationDetailPath(item)}>
                        {actionLabel(item.action_required, item.source)}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
