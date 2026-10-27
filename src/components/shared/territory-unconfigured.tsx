import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown instead of every dashboard page when a territorial or admin role has
 * no territory: the API answers those accounts 403, so the panel is unusable.
 */
export async function TerritoryUnconfigured() {
  const t = await getTranslations("access.page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("unconfiguredTerritoryTitle")} />
      <Alert variant="destructive">
        <AlertTitle>{t("unconfiguredTerritoryTitle")}</AlertTitle>
        <AlertDescription>{t("unconfiguredTerritoryDescription")}</AlertDescription>
      </Alert>
    </div>
  );
}
