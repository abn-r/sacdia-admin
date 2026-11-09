"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentOrdersTray } from "@/components/payment-orders/payment-orders-tray";
import { PaymentObligationsClient } from "@/components/payment-orders/payment-obligations-client";
import { ReassignmentsTray } from "@/components/payment-orders/reassignments-tray";
import {
  type PaymentOrderTabFlags,
  visiblePaymentOrderTabs,
} from "@/components/payment-orders/payment-order-tabs";

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
  const tObligations = useTranslations("payment_obligations");
  const visible = visiblePaymentOrderTabs(tabs);
  // A deep link to a specific order lands on the orders tab, where its
  // detail sheet opens.
  const opensOrder = (orderId: string | null) =>
    Boolean(orderId) && visible.includes("orders");
  const defaultTab = opensOrder(initialOrderId) ? "orders" : visible[0];
  const [activeTab, setActiveTab] = useState<string | undefined>(defaultTab);
  // The obligations tab links here with a new `?orderId=` while this client
  // stays mounted, so switch tabs when the deep link changes.
  const [linkedOrderId, setLinkedOrderId] = useState(initialOrderId);
  if (initialOrderId !== linkedOrderId) {
    setLinkedOrderId(initialOrderId);
    if (opensOrder(initialOrderId)) setActiveTab("orders");
  }

  if (!defaultTab) {
    return null;
  }

  return (
    <Tabs
      value={activeTab ?? defaultTab}
      onValueChange={setActiveTab}
      className="space-y-4"
    >
      {visible.length > 1 ? (
        <TabsList>
          {tabs.pending ? (
            <TabsTrigger value="pending">{tObligations("tabs.pending")}</TabsTrigger>
          ) : null}
          {tabs.orders ? (
            <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
          ) : null}
          {tabs.reassignments ? (
            <TabsTrigger value="reassignments">
              {t("tabs.reassignments")}
            </TabsTrigger>
          ) : null}
        </TabsList>
      ) : null}
      {tabs.pending ? (
        <TabsContent value="pending">
          <PaymentObligationsClient />
        </TabsContent>
      ) : null}
      {tabs.orders ? (
        <TabsContent value="orders">
          <PaymentOrdersTray initialOrderId={initialOrderId} />
        </TabsContent>
      ) : null}
      {tabs.reassignments ? (
        <TabsContent value="reassignments">
          <ReassignmentsTray />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
