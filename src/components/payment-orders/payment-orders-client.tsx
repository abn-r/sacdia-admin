"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentOrdersTray } from "@/components/payment-orders/payment-orders-tray";
import { PaymentObligationsClient } from "@/components/payment-orders/payment-obligations-client";
import { ReassignmentsTray } from "@/components/payment-orders/reassignments-tray";

export function PaymentOrdersClient() {
  const t = useTranslations("payment_orders");
  const tObligations = useTranslations("payment_obligations");

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pending">{tObligations("tabs.pending")}</TabsTrigger>
        <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
        <TabsTrigger value="reassignments">
          {t("tabs.reassignments")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pending">
        <PaymentObligationsClient />
      </TabsContent>
      <TabsContent value="orders">
        <PaymentOrdersTray />
      </TabsContent>
      <TabsContent value="reassignments">
        <ReassignmentsTray />
      </TabsContent>
    </Tabs>
  );
}
