import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Building2 } from "lucide-react";
import { ClubsListClient } from "@/components/clubs/clubs-list-client";
import { fetchClubsList } from "@/lib/clubs/fetch-list";
import { getSelectOptions } from "@/lib/catalogs/service";
import { readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canManageClubsByRole,
  hasPermission,
} from "@/lib/auth/permission-utils";
import { CLUBS_UPDATE } from "@/lib/auth/permissions";
import { fetchPendingCountsByClubId } from "@/lib/dashboard/fetch-scoped-dashboard";

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
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");
  const localFieldRaw = readParam(raw, "localFieldId");

  const active =
    activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const localFieldId = localFieldRaw ? Number(localFieldRaw) : undefined;

  const result = await fetchClubsList({
    page,
    limit,
    search,
    active,
    localFieldId:
      localFieldId && Number.isFinite(localFieldId) ? localFieldId : undefined,
  });

  const localFieldOptions = await getSelectOptions("local-fields").catch(() => []);
  const canCreate =
    hasPermission(user, "clubs:create") && canManageClubsByRole(user);
  const canEdit = hasPermission(user, CLUBS_UPDATE);
  const pendingCountsByClubId = result.available
    ? await fetchPendingCountsByClubId(user, result.items)
    : {};

  if (!result.available) {
    return (
      <div className="space-y-6">
        <EndpointErrorBanner state="missing" detail={result.error === "UNEXPECTED" ? t("unexpectedError") : (result.error ?? t("endpointError"))} />
        <EmptyState icon={Building2} title={t("cannotShow")} description={result.error === "UNEXPECTED" ? t("unexpectedError") : result.error} />
      </div>
    );
  }

  return (
    <ClubsListClient
      items={result.items}
      meta={result.meta}
      localFieldOptions={localFieldOptions}
      canCreate={canCreate}
      canEdit={canEdit}
      pendingCountsByClubId={pendingCountsByClubId}
    />
  );
}
