import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CamporeeOrderReviewTray } from "@/components/camporee-orders/camporee-order-review-tray";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CAMPOREE_ORDERS_REVIEW } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporee_orders.reviewPage");
  return { title: t("title") };
}

export default async function CamporeeOrderReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("camporee_orders");
  const params = await searchParams;
  const rawOrderId = params.orderId;
  const orderId =
    typeof rawOrderId === "string" && rawOrderId.trim().length > 0
      ? rawOrderId.trim()
      : null;

  if (!hasPermission(user, CAMPOREE_ORDERS_REVIEW)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("reviewPage.title")}
          description={t("reviewPage.description")}
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
        title={t("reviewPage.title")}
        description={t("reviewPage.description")}
      />
      <CamporeeOrderReviewTray initialOrderId={orderId} />
    </div>
  );
}
