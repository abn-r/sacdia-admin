import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InsuranceConfigClient } from "@/components/insurance/insurance-config-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  FIELD_PAYMENT_ORDERS_CONFIGURE,
  INSURANCE_CONFIGURE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("insurance_config.page");
  return { title: t("title") };
}

export default async function InsuranceConfigPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("insurance_config");

  const canConfigureInsurance = hasPermission(user, INSURANCE_CONFIGURE);
  const canConfigurePaymentInstructions = hasPermission(
    user,
    FIELD_PAYMENT_ORDERS_CONFIGURE,
  );

  if (!canConfigureInsurance && !canConfigurePaymentInstructions) {
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

  const scope = user.authorization?.effective?.scope as
    | { global?: { local_field?: { id?: number } } }
    | undefined;
  const requiresLocalFieldId =
    typeof scope?.global?.local_field?.id !== "number";

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />
      <InsuranceConfigClient
        requiresLocalFieldId={requiresLocalFieldId}
        canConfigureInsurance={canConfigureInsurance}
        canConfigurePaymentInstructions={canConfigurePaymentInstructions}
      />
    </div>
  );
}
