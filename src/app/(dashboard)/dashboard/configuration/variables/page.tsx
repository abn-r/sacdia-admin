import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { SystemConfigClientPage } from "@/components/system-config/system-config-client-page";
import { getSystemConfigs, type SystemConfig } from "@/lib/api/system-config";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function ConfigurationVariablesPage() {
  await requireAdminUser();
  const t = await getTranslations("settings.pages.root");
  const tNav = await getTranslations("nav.items");

  let configs: SystemConfig[] = [];
  let loadError: string | null = null;

  try {
    configs = await getSystemConfigs();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadFailed");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tNav("configuration"), href: "/dashboard/configuration" },
          { label: t("title") },
        ]}
      />

      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}

      {!loadError && configs.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : null}

      {!loadError && configs.length > 0 ? (
        <SystemConfigClientPage initialConfigs={configs} />
      ) : null}
    </div>
  );
}
