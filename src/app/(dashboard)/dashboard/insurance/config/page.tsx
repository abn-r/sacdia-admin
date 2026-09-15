import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InsuranceConfigClient } from "@/components/insurance/insurance-config-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("insurance_config.page");
  return { title: t("title") };
}

export default async function InsuranceConfigPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("insurance_config");

  const canConfigureInsurance = canCapability(
    user,
    "insurance-config",
    "configure",
  );
  const canConfigurePaymentInstructions = canCapability(
    user,
    "insurance-config",
    "configure_payment_instructions",
  );

  if (!canViewScreen(user, "insurance-config")) {
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

  const territory = resolveAdminTerritoryScope(user);
  const requiresLocalFieldId = territory.level !== "local_field";
  const localFieldOptions =
    requiresLocalFieldId && territory.level !== "all"
      ? await listLocalFieldsForTerritory(user).catch(() => [])
      : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />
      <InsuranceConfigClient
        requiresLocalFieldId={requiresLocalFieldId}
        localFieldOptions={localFieldOptions}
        canConfigureInsurance={canConfigureInsurance}
        canConfigurePaymentInstructions={canConfigurePaymentInstructions}
      />
    </div>
  );
}
