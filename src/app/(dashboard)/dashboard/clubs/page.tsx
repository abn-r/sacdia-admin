import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubsListClient } from "@/components/clubs/clubs-list-client";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadClubsList } from "@/lib/clubs/list-load";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
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
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = Math.min(readPositiveNumberParam(raw, "limit") ?? 20, 100);
  const activeRaw = readParam(raw, "active");
  const localFieldRaw = readParam(raw, "localFieldId");
  // `name` and `q` are older aliases the list client still accepts.
  const search =
    (readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q"))
      ?.trim()
      .slice(0, 100) || undefined;

  const active =
    activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const requestedLocalFieldId = localFieldRaw ? Number(localFieldRaw) : undefined;
  const territory = resolveAdminTerritoryScope(user);
  const localFields = await listLocalFieldsForTerritory(user).catch(() => []);
  const allowedLocalFieldIds = new Set(
    localFields.map((localField) => localField.local_field_id),
  );
  const localFieldId =
    requestedLocalFieldId &&
    Number.isFinite(requestedLocalFieldId) &&
    (territory.level === "all" || allowedLocalFieldIds.has(requestedLocalFieldId))
      ? requestedLocalFieldId
      : undefined;

  const result = await loadClubsList({
    page,
    limit,
    active,
    localFieldId: canAdminFilterByLocalField(territory) ? localFieldId : undefined,
    search,
  });

  const localFieldOptions = localFields.map((localField) => ({
    label: localField.name,
    value: localField.local_field_id,
  }));
  const canEdit = canCapability(user, "clubs", "update");
  const canCreate = canCapability(user, "clubs", "create");
  const canBulkImport = canCapability(user, "clubs", "bulk_create");

  // A failed load keeps the header and filters; only the content changes.
  return (
    <ClubsListClient
      items={result.ok ? result.items : []}
      meta={result.ok ? result.meta : { page, limit, total: 0, totalPages: 1 }}
      localFieldOptions={localFieldOptions}
      canEdit={canEdit}
      canCreate={canCreate}
      canBulkImport={canBulkImport}
      loadError={result.ok ? undefined : result.error}
    />
  );
}
