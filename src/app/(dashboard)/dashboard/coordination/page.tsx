import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { ErrorState } from "@/components/shared/error-state";
import { CoordinationAdminClient } from "@/components/coordination/coordination-admin-client";
import { errorStateFromError } from "@/lib/api/error-state";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
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
  const tc = await getTranslations("people.community.coordination");

  if (!canViewScreen(user, "coordination")) {
    return <PageAccessForbidden title={t("page.title")} />;
  }

  const territoryScope = resolveAdminTerritoryScope(user);
  let localFields: LocalField[] = [];
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    localFields = await listLocalFieldsForTerritory(user);
  } catch (error) {
    failure = errorStateFromError(error);
  }

  if (failure) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("page.title")} description={tc("page.description")} />
        <ErrorState
          kind={failure.kind}
          detail={failure.detail}
          title={tc("loadError.fieldsTitle")}
          retry
        />
      </div>
    );
  }

  return (
    <CoordinationAdminClient
      localFields={localFields}
      territoryScope={territoryScope}
      canManage={canCapability(user, "coordination", "manage")}
    />
  );
}
