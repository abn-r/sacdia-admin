import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PaymentOrdersClient } from "@/components/payment-orders/payment-orders-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasPermission } from "@/lib/auth/permission-utils";
import { FIELD_PAYMENT_ORDERS_REVIEW } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payment_orders.page");
  return { title: t("title") };
}

export default async function PaymentOrdersPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("payment_orders");

  if (!hasPermission(user, FIELD_PAYMENT_ORDERS_REVIEW)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page.title")}
          description={t("page.description")}
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
      <PageHeader title={t("page.title")} description={t("page.description")} />
      <PaymentOrdersClient />
    </div>
  );
}
