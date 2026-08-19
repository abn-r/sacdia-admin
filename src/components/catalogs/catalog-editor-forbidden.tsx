import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export async function CatalogEditorForbidden() {
  const t = await getTranslations("catalogs.gate");

  return (
    <div className="space-y-6">
      <PageHeader title={t("forbiddenTitle")} />
      <Alert variant="destructive">
        <AlertTitle>{t("forbiddenTitle")}</AlertTitle>
        <AlertDescription>{t("forbiddenDescription")}</AlertDescription>
      </Alert>
    </div>
  );
}
