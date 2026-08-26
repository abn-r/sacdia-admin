import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CamporeeOrderCatalogClient } from "@/components/camporee-orders/camporee-order-catalog-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_ORDERS_CATALOG_MANAGE,
  CAMPOREE_ORDERS_READ,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporee_orders.catalogPage");
  return { title: t("title") };
}

export default async function CamporeeOrderCatalogPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("camporee_orders");

  if (
    !hasAnyPermission(user, [
      CAMPOREE_ORDERS_READ,
      CAMPOREE_ORDERS_CATALOG_MANAGE,
    ])
  ) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("catalogPage.title")}
          description={t("catalogPage.description")}
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
        title={t("catalogPage.title")}
        description={t("catalogPage.description")}
      />
      <CamporeeOrderCatalogClient />
    </div>
  );
}
