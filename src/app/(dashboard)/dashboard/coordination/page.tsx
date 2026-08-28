import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CoordinationAdminClient } from "@/components/coordination/coordination-admin-client";
import { ApiError } from "@/lib/api/client";
import { hasPermission } from "@/lib/auth/permission-utils";
import { COORDINATION_MANAGE } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalField } from "@/lib/api/geography";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("coordinationAdmin.page");
  return { title: t("title") };
}

export default async function CoordinationAdminPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("coordinationAdmin");
  const territoryScope = resolveAdminTerritoryScope(user);

  if (!hasPermission(user, COORDINATION_MANAGE)) {
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

  let localFields: LocalField[] = [];
  let loadError: string | null = null;

  try {
    localFields = await listLocalFieldsForTerritory(user);
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : t("errors.generic");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {loadError ? (
        <EndpointErrorBanner state="missing" detail={loadError} />
      ) : (
        <CoordinationAdminClient
          localFields={localFields}
          territoryScope={territoryScope}
        />
      )}
    </div>
  );
}
