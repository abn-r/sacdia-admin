import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { VariablesForm } from "@/components/system-config/variables-form";
import { getSystemConfigs, type SystemConfig } from "@/lib/api/system-config";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.pages.root");
  return { title: t("title") };
}

export default async function ConfigurationVariablesPage() {
  await requireAdminUser();
  const t = await getTranslations("settings.pages.root");
  const tVars = await getTranslations("admin.configuration.variables");
  const tRail = await getTranslations("admin.configuration.rail");

  let configs: SystemConfig[] = [];
  let loadError: string | null = null;

  try {
    configs = await getSystemConfigs();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadFailed");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tRail("items.variables")} description={tVars("description")} />

      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}

      {!loadError && configs.length === 0 ? (
        <EmptyState icon={Settings2} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : null}

      {!loadError && configs.length > 0 ? <VariablesForm initialConfigs={configs} /> : null}
    </div>
  );
}
