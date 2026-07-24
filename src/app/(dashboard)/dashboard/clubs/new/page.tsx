import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import {
  resolveAdminTerritoryScope,
  type AdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { listEntityItems } from "@/lib/catalogs/service";
import { listAdminUnions } from "@/lib/api/generic-catalogs-i18n";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { createClubWithSectionsAction } from "@/lib/clubs/actions";
import {
  toChurchOptions,
  toClubTypeOptions,
  toDistrictOptions,
  toLocalFieldOptions,
} from "@/lib/clubs/create-form-options";

type RawCatalogItem = Record<string, unknown>;

type ScopableItem = "local-fields" | "districts" | "churches" | "club-types";

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

  if (Array.isArray(root.data)) {
    return root.data as RawCatalogItem[];
  }

  return [];
}

async function listScopedEntityItems(
  entityKey: ScopableItem,
  query: Record<string, string> = {},
): Promise<RawCatalogItem[]> {
  try {
    return await listEntityItems(entityKey, query);
  } catch {
    return [];
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

async function listClubScopeCatalogs(scope: AdminTerritoryScope) {
  if (scope.level === "local_field") {
    const localFieldsByUnion = await listScopedEntityItems("local-fields", {
      ...(scope.unionId ? { unionId: String(scope.unionId) } : {}),
    });
    const localFields = localFieldsByUnion.filter(
      (item) => toPositiveNumber(item.local_field_id) === scope.localFieldId,
    );
    const districts = await listDistrictsByLocalFields(localFields);
    const churches = await listChurchesByDistricts(districts);

    return { localFields, districts, churches };
  }

  if (scope.level === "union") {
    const localFields = await listScopedEntityItems("local-fields", {
      unionId: String(scope.unionId),
    });
    const districts = await listDistrictsByLocalFields(localFields);
    const churches = await listChurchesByDistricts(districts);

    return { localFields, districts, churches };
  }

  if (scope.level === "division") {
    const unionsPayload = await listAdminUnions({ divisionId: scope.divisionId }).catch(() => [] as unknown);
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

export default async function NewClubPage() {
  const user = await requireAdminUser();
  if (!canManageClubsByRole(user)) {
    redirect("/dashboard/clubs");
  }
  const t = await getTranslations("clubs.pages.new");
  const territoryScope = resolveAdminTerritoryScope(user);

  const [{ localFields, districts, churches }, clubTypeItems] = await Promise.all([
    listClubScopeCatalogs(territoryScope),
    listScopedEntityItems("club-types"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <CreateClubForm
        localFields={toLocalFieldOptions(localFields)}
        districts={toDistrictOptions(districts)}
        churches={toChurchOptions(churches)}
        clubTypes={toClubTypeOptions(clubTypeItems)}
        formAction={createClubWithSectionsAction}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        googleMapsMapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      />
    </div>
  );
}
