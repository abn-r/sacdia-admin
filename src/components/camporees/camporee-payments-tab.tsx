"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { PlusCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CamporeePaymentsPanel } from "@/components/camporees/camporee-payments-panel";
import {
  CamporeePaymentBalance,
  inscriptionCreditsFromOrders,
  mergeCamporeePaymentLedger,
} from "@/components/camporees/camporee-payment-balance";
import {
  getCamporeePayments,
  getUnionCamporeePayments,
  listCamporeeMembers,
  listUnionCamporeeMembers,
  type CamporeeMember,
  type CamporeePayment,
} from "@/lib/api/camporees";
import { listPaymentOrders, type PaymentOrder } from "@/lib/api/field-payment-orders";
import {
  LOCAL_CAMPOREE_MEMBERS_MAX_LIMIT,
  UNION_CAMPOREE_MEMBERS_MAX_LIMIT,
  normalizeCamporeeMembers,
} from "@/lib/camporees/member-display";

export interface CamporeePaymentsTabProps {
  camporeeId: number;
  initialPayments: CamporeePayment[];
  initialMembers?: CamporeeMember[];
  initialOrders?: PaymentOrder[];
  membersTotal?: number;
  registrationCost?: number | null;
  isUnionCamporee?: boolean;
  onAfterChange?: () => void;
  onLedgerCountChange?: (count: number) => void;
}

export function CamporeePaymentsTab({
  camporeeId,
  initialPayments,
  initialMembers = [],
  initialOrders = [],
  membersTotal,
  registrationCost,
  isUnionCamporee = false,
  onAfterChange,
  onLedgerCountChange,
}: CamporeePaymentsTabProps) {
  const t = useTranslations("camporees.paymentsBalance");
  const [payments, setPayments] = useState<CamporeePayment[]>(initialPayments);
  const [members, setMembers] = useState<CamporeeMember[]>(() =>
    normalizeCamporeeMembers(initialMembers),
  );
  const [totalMembers, setTotalMembers] = useState(
    membersTotal ?? initialMembers.length,
  );
  const [orders, setOrders] = useState<PaymentOrder[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshPayments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [paymentsPayload, membersPayload, ordersPayload] = await Promise.all([
        isUnionCamporee
          ? getUnionCamporeePayments(camporeeId)
          : getCamporeePayments(camporeeId),
        isUnionCamporee
          ? listUnionCamporeeMembers(camporeeId, {
              page: 1,
              limit: UNION_CAMPOREE_MEMBERS_MAX_LIMIT,
            })
          : listCamporeeMembers(camporeeId, {
              page: 1,
              // Local members DTO @Max(100); union allows 200.
              limit: LOCAL_CAMPOREE_MEMBERS_MAX_LIMIT,
            }),
        listPaymentOrders({
          purpose: "CAMPOREE",
          ...(isUnionCamporee
            ? { union_camporee_id: camporeeId }
            : { camporee_id: camporeeId }),
        }).catch(() => [] as PaymentOrder[]),
      ]);

      const raw = paymentsPayload as unknown;
      let list: CamporeePayment[] = [];
      if (Array.isArray(raw)) {
        list = raw as CamporeePayment[];
      } else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) {
          list = r.data as CamporeePayment[];
        }
      }
      setPayments(list);
      setMembers(normalizeCamporeeMembers(membersPayload.data ?? []));
      setTotalMembers(membersPayload.meta?.total ?? membersPayload.data?.length ?? 0);
      setOrders(ordersPayload);
      onAfterChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("refreshError");
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId, isUnionCamporee, onAfterChange, t]);

  useEffect(() => {
    let cancelled = false;
    void listPaymentOrders({
      purpose: "CAMPOREE",
      ...(isUnionCamporee
        ? { union_camporee_id: camporeeId }
        : { camporee_id: camporeeId }),
    })
      .then((rows) => {
        if (!cancelled) setOrders(rows);
      })
      .catch(() => {
        if (!cancelled && initialOrders.length === 0) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [camporeeId, isUnionCamporee, initialOrders.length]);

  const orderCredits = useMemo(
    () => inscriptionCreditsFromOrders(orders),
    [orders],
  );
  const ledgerPayments = useMemo(
    () => mergeCamporeePaymentLedger(payments, orders, members),
    [payments, orders, members],
  );
  const hideLegacyRegister = orders.length > 0;

  useEffect(() => {
    onLedgerCountChange?.(ledgerPayments.length);
  }, [ledgerPayments.length, onLedgerCountChange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshPayments}
            disabled={isLoading}
            title={t("refresh")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("refresh")}</span>
          </Button>
          {!isUnionCamporee && !hideLegacyRegister && (
            <Button size="sm" asChild className="rounded-full">
              <Link href={`/dashboard/campamentos/${camporeeId}/payments/new`}>
                <PlusCircle className="size-4" />
                {t("registerPayment")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CamporeePaymentBalance
        members={members}
        payments={payments}
        registrationCost={registrationCost}
        membersTotal={totalMembers}
        orderCredits={orderCredits}
        orderCount={orders.length}
      />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("ledgerTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("ledgerDescription")}</p>
        </div>
        <CamporeePaymentsPanel
          camporeeId={camporeeId}
          payments={ledgerPayments}
          onPaymentsChange={refreshPayments}
          isUnionCamporee={isUnionCamporee}
        />
      </div>
    </div>
  );
}
