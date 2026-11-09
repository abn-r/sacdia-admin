import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PaymentOrdersClient } from "@/components/payment-orders/payment-orders-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payment_orders.page");
  return { title: t("title") };
}

export default async function PaymentOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const params = await searchParams;
  const rawOrderId = params.orderId;
  const orderId =
    typeof rawOrderId === "string" && rawOrderId.trim().length > 0
      ? rawOrderId.trim()
      : null;
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
      <PaymentOrdersClient tabs={tabs} initialOrderId={orderId} />
    </div>
  );
}
