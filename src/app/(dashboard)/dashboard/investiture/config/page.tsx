import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import { ConfigClientPage } from "@/components/investiture/config-client-page";
import { getInvestitureConfigs, type InvestitureConfig } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory, resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";
import type { LocalField } from "@/lib/api/geography";

export default async function InvestitureConfigPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture");
  const territoryScope = resolveAdminTerritoryScope(user);

  let configs: InvestitureConfig[] = [];
  let localFields: LocalField[] = [];
  let loadError: string | null = null;

  try {
    const [data, scopedLocalFields] = await Promise.all([
      getInvestitureConfigs(),
      listLocalFieldsForTerritory(user),
    ]);
    configs = Array.isArray(data) ? data : [];
    localFields = scopedLocalFields;
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("pageConfig.errorFallback");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageConfig.title")}
        description={t("pageConfig.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (
        <InvestitureI18nProvider>
          <ConfigClientPage
            initialConfigs={configs}
            localFields={localFields}
            territoryScope={territoryScope}
          />
        </InvestitureI18nProvider>
      )}
    </div>
  );
}
