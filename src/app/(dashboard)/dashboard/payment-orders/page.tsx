import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PaymentOrdersClient } from "@/components/payment-orders/payment-orders-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payment_orders.page");
  return { title: t("title") };
}

export default async function PaymentOrdersPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("payment_orders");
  const tPending = await getTranslations("payment_obligations");

  const tabs = {
    pending: canCapability(user, "payment-orders", "pending"),
    orders: canCapability(user, "payment-orders", "orders"),
    reassignments: canCapability(user, "payment-orders", "reassignments"),
  };

  if (!canViewScreen(user, "payment-orders")) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={tPending("page.title")}
          description={tPending("page.description")}
        />
        <Alert variant="destructive">
          <AlertTitle>{t("gate.forbiddenTitle")}</AlertTitle>
          <AlertDescription>{t("gate.forbiddenDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tPending("page.title")}
        description={tPending("page.description")}
      />
      <PaymentOrdersClient tabs={tabs} />
    </div>
  );
}
