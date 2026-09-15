"use client";

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
}

export function PaymentOrdersClient({ tabs }: PaymentOrdersClientProps) {
  const t = useTranslations("payment_orders");
  const tObligations = useTranslations("payment_obligations");
  const visible = visiblePaymentOrderTabs(tabs);
  const defaultTab = visible[0];

  if (!defaultTab) {
    return null;
  }

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
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
          <PaymentOrdersTray />
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
