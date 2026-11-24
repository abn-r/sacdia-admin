"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/page-header";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { PaymentOrderReviewSheet } from "@/components/payment-orders/payment-order-review-sheet";
import { PaymentOrdersQueue } from "@/components/payment-orders/payment-orders-tray";
import { ReassignmentsTray } from "@/components/payment-orders/reassignments-tray";
import { usePaymentOrdersData } from "@/components/payment-orders/use-payment-orders-data";
import { errorStateFromError } from "@/lib/api/error-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  countOrdersByTab,
  isPaymentOrderTab,
  oldestReviewWaitDays,
  visiblePaymentOrderTabs,
  type PaymentOrderQueueTab,
  type PaymentOrderTabFlags,
} from "@/lib/payment-orders/queue";

interface PaymentOrdersClientProps {
  tabs: PaymentOrderTabFlags;
  /** Order to open on load (from the `?orderId=` deep link). */
  initialOrderId?: string | null;
}

export function PaymentOrdersClient({
  tabs,
  initialOrderId = null,
}: PaymentOrdersClientProps) {
  const t = useTranslations("payment_orders");
  const tt = useTranslations("ops.paymentOrders");
  const visible = visiblePaymentOrderTabs(tabs);
  const defaultTab = tabs.orders ? "review" : "reassignments";
  const requested = useUrlTab("tab", defaultTab);
  const active =
    isPaymentOrderTab(requested) && visible.includes(requested)
      ? requested
      : defaultTab;

  const data = usePaymentOrdersData(tabs.orders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrderId,
  );
  // The deep link can change while this client stays mounted.
  const [linkedOrderId, setLinkedOrderId] = useState(initialOrderId);
  if (initialOrderId !== linkedOrderId) {
    setLinkedOrderId(initialOrderId);
    if (initialOrderId) setSelectedOrderId(initialOrderId);
  }

  if (visible.length === 0) return null;

  const loaded = !data.loading && !data.error;
  const counts = loaded ? countOrdersByTab(data.orders) : null;
  const oldest = loaded
    ? oldestReviewWaitDays(data.orders, data.proofDates)
    : null;
  const description =
    counts && tabs.orders
      ? tt("page.summary", {
          count: counts.review,
          days: oldest ?? 0,
        })
      : undefined;

  const labels: Record<string, string> = {
    review: t("tray.reviewQueue"),
    waiting: tt("tabs.waiting"),
    rejected: tt("tabs.rejected"),
    all: tt("tabs.all"),
    reassignments: t("tabs.reassignments"),
  };

  const tabItems = visible.map((id) => ({
    value: id,
    label: labels[id] ?? id,
    ...(counts && (id === "review" || id === "waiting" || id === "rejected")
      ? { count: counts[id] }
      : {}),
  }));

  const renderContent = () => {
    if (active === "reassignments") return <ReassignmentsTray />;
    if (data.loading) {
      return (
        <p className="text-muted-foreground text-sm" role="status">
          {t("tray.loading")}
        </p>
      );
    }
    if (data.error) {
      const state = errorStateFromError(data.error);
      return (
        <ErrorState
          kind={state.kind}
          {...(state.detail ? { detail: state.detail } : {})}
          onRetry={() => void data.reload()}
        />
      );
    }
    const tab = active as PaymentOrderQueueTab;
    return (
      <>
        {data.stale && data.updatedAt ? (
          <StaleDataNotice
            at={data.updatedAt}
            onRetry={() => void data.reload()}
          />
        ) : null}
        <PaymentOrdersQueue
          key={tab}
          orders={data.orders}
          tab={tab}
          proofDates={data.proofDates}
          error={tab === "review" ? undefined : data.listError}
          onRetry={() => void data.reload()}
          onOpen={setSelectedOrderId}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        {...(description ? { description } : {})}
      />
      <div className="space-y-4">
        {visible.length > 1 ? (
          <UrlTabs
            tabs={tabItems}
            defaultValue={defaultTab}
            ariaLabel={t("page.title")}
          />
        ) : null}
        {renderContent()}
      </div>
      {tabs.orders ? (
        <PaymentOrderReviewSheet
          orderId={selectedOrderId}
          open={selectedOrderId != null}
          onOpenChange={(open) => {
            if (!open) setSelectedOrderId(null);
          }}
          onChanged={() => void data.reload()}
        />
      ) : null}
    </div>
  );
}
