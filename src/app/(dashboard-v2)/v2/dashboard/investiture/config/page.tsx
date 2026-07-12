import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import { ConfigClientPage } from "@/components/investiture/config-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadInvestitureConfigList } from "@/lib/v2/loaders/investiture";

function InvestitureConfigSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function InvestitureConfigContent() {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture");
  const { configs, localFields, territoryScope, error } =
    await loadInvestitureConfigList(user);

  if (error) {
    return (
      <EndpointErrorBanner
        state={error.status === 403 ? "forbidden" : "missing"}
        detail={error.message || t("pageConfig.errorFallback")}
      />
    );
  }

  return (
    <InvestitureI18nProvider>
      <ConfigClientPage
        initialConfigs={configs}
        localFields={localFields}
        territoryScope={territoryScope}
      />
    </InvestitureI18nProvider>
  );
}

export default async function V2InvestitureConfigPage() {
  await requireAdminUser();
  const t = await getTranslations("investiture");

  return (
    <V2PageShell
      title={t("pageConfig.title")}
      description={t("pageConfig.description")}
      bleed
    >
      <Suspense fallback={<InvestitureConfigSkeleton />}>
        <InvestitureConfigContent />
      </Suspense>
    </V2PageShell>
  );
}
