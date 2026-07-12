import Link from "next/link";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import { listEntityItems } from "@/lib/catalogs/service";
import { resolveAdminTerritoryScope, type AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { listAdminUnions } from "@/lib/api/generic-catalogs-i18n";
import { ClubsBulkImport } from "@/components/clubs/clubs-bulk-import";
import { bulkCreateClubsAction } from "@/lib/clubs/actions";

type RawCatalogItem = Record<string, unknown>;

type ScopableItem = "local-fields" | "districts" | "churches";

type SelectOption = { label: string; value: number };

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractArray(payload: unknown): RawCatalogItem[] {
  if (Array.isArray(payload)) {
    return payload as RawCatalogItem[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) return root.data as RawCatalogItem[];
  return [];
}

async function listScopedEntityItems(entityKey: ScopableItem, query: Record<string, string> = {}) {
  try {
    return await listEntityItems(entityKey, query);
  } catch {
    return [] as RawCatalogItem[];
  }
}

function extractDistrictIds(items: RawCatalogItem[]): number[] {
  return items
    .map((item) => toPositiveNumber(item.districlub_type_id ?? item.district_id))
    .filter((value): value is number => value !== null);
}

function extractLocalFieldIds(items: RawCatalogItem[]): number[] {
  return items
    .map((item) => toPositiveNumber(item.local_field_id))
    .filter((value): value is number => value !== null);
}

async function listDistrictsByLocalFields(localFields: RawCatalogItem[]) {
  const localFieldIds = extractLocalFieldIds(localFields);
  const districtBatches = await Promise.allSettled(
    localFieldIds.map((id) => listScopedEntityItems("districts", { localFieldId: String(id) })),
  );

  return districtBatches
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .map((item) => item as RawCatalogItem);
}

async function listChurchesByDistricts(districts: RawCatalogItem[]) {
  const districtIds = extractDistrictIds(districts);
  const churchBatches = await Promise.allSettled(
    districtIds.map((id) => listScopedEntityItems("churches", { districtId: String(id) })),
  );

  return churchBatches
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .map((item) => item as RawCatalogItem);
}

async function listClubScopeGeography(scope: AdminTerritoryScope) {
  if (scope.level === "local_field") {
    const localFieldsByUnion = scope.unionId
      ? await listScopedEntityItems("local-fields", { unionId: String(scope.unionId) })
      : [];
    const localFields = localFieldsByUnion.filter(
      (item) => toPositiveNumber(item.local_field_id) === scope.localFieldId,
    );
    const districts = await listDistrictsByLocalFields(localFields);
    const churches = await listChurchesByDistricts(districts);

    return { localFields, districts, churches };
  }

  if (scope.level === "union") {
    const localFields = scope.unionId
      ? await listScopedEntityItems("local-fields", { unionId: String(scope.unionId) })
      : [];
    const districts = await listDistrictsByLocalFields(localFields);
    const churches = await listChurchesByDistricts(districts);
    return { localFields, districts, churches };
  }

  if (scope.level === "division") {
    const unionsPayload = await listAdminUnions({ divisionId: scope.divisionId });
    const unions = extractArray(unionsPayload);

    const localFieldBatches = await Promise.allSettled(
      unions
        .map((union) => toPositiveNumber((union as RawCatalogItem).union_id))
        .filter((value): value is number => value !== null)
        .map((unionId) => listScopedEntityItems("local-fields", { unionId: String(unionId) })),
    );

    const localFields = localFieldBatches
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .map((item) => item as RawCatalogItem);

    const districts = await listDistrictsByLocalFields(localFields);
    const churches = await listChurchesByDistricts(districts);
    return { localFields, districts, churches };
  }

  return {
    localFields: await listScopedEntityItems("local-fields"),
    districts: await listScopedEntityItems("districts"),
    churches: await listScopedEntityItems("churches"),
  };
}

function toSelectOptions(items: RawCatalogItem[], idField: string): SelectOption[] {
  return items
    .flatMap((item) => {
      const value = toPositiveNumber(item[idField]);
      if (!value) return [];
      const rawName = item.name;
      const name = typeof rawName === "string" ? rawName.trim() : String(rawName ?? "").trim();
      if (!name) return [];
      return [{ label: name, value } satisfies SelectOption];
    })
    .filter((item): item is SelectOption =>
      Boolean(item.label.length > 0 && Number.isFinite(item.value)),
    );
}

export default async function ImportClubsPage() {
  const user = await requireAdminUser();
  if (!canManageClubsByRole(user)) {
    panelRedirect("/dashboard/clubs");
  }

  const t = await getTranslations("clubs.pages.import");
  const territoryScope = resolveAdminTerritoryScope(user);

  const { localFields, districts, churches } = await listClubScopeGeography(territoryScope);
  const localFieldOptions = toSelectOptions(localFields, "local_field_id");
  const districtOptions = toSelectOptions(districts, "districlub_type_id");
  const churchOptions = toSelectOptions(churches, "church_id");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <ClubsBulkImport
        localFields={localFieldOptions}
        districts={districtOptions}
        churches={churchOptions}
        submitAction={bulkCreateClubsAction}
      />
    </div>
  );
}
