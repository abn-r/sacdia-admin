"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentOrdersTray } from "@/components/payment-orders/payment-orders-tray";
import { ReassignmentsTray } from "@/components/payment-orders/reassignments-tray";

export function PaymentOrdersClient() {
  const t = useTranslations("payment_orders");

  return (
    <Tabs defaultValue="orders" className="space-y-4">
      <TabsList>
        <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
        <TabsTrigger value="reassignments">
          {t("tabs.reassignments")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="orders">
        <PaymentOrdersTray />
      </TabsContent>
      <TabsContent value="reassignments">
        <ReassignmentsTray />
      </TabsContent>
    </Tabs>
  );
}
