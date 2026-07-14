import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";

import { ClubsListClient } from "@/components/clubs/clubs-list-client";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { listAdminLocalFields } from "@/lib/api/admin-local-fields";
import { canUpdateClubs } from "@/lib/auth/permission-utils";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchClubsList } from "@/lib/clubs/fetch-list";
import {
  readParam,
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clubs.pages.list");
  return { title: t("title") };
}

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs.pages.list");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = Math.min(readPositiveNumberParam(raw, "limit") ?? 20, 100);
  const activeRaw = readParam(raw, "active");
  const localFieldRaw = readParam(raw, "localFieldId");

  const active =
    activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const localFieldId = localFieldRaw ? Number(localFieldRaw) : undefined;

  const result = await fetchClubsList({
    page,
    limit,
    active,
    localFieldId:
      localFieldId && Number.isFinite(localFieldId) ? localFieldId : undefined,
  });

  const localFields = await listAdminLocalFields().catch(() => []);
  const localFieldOptions = localFields.map((localField) => ({
    label: localField.name,
    value: localField.local_field_id,
  }));
  const canEdit = canUpdateClubs(user);

  if (!result.available) {
    return (
      <div className="space-y-6">
        <EndpointErrorBanner
          state="missing"
          detail={
            result.error === "UNEXPECTED"
              ? t("unexpectedError")
              : (result.error ?? t("endpointError"))
          }
        />
        <EmptyState
          icon={Building2}
          title={t("cannotShow")}
          description={
            result.error === "UNEXPECTED" ? t("unexpectedError") : result.error
          }
        />
      </div>
    );
  }

  return (
    <ClubsListClient
      items={result.items}
      meta={result.meta}
      localFieldOptions={localFieldOptions}
      canEdit={canEdit}
    />
  );
}
