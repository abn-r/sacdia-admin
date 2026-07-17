import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InventoryView } from "@/components/inventory/inventory-view";
import { apiRequest, ApiError } from "@/lib/api/client";
import { listInventoryCategories, listClubInventory } from "@/lib/api/inventory";
import { listClubTypes } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import {
  buildInventorySectionOptions,
  clubTypeIdToInstanceType,
  extractArray,
  filterInventorySections,
  type InventorySectionOption,
} from "@/lib/inventory/club-sections";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import type { InventoryItem, InventoryCategory } from "@/lib/api/inventory";

type AnyRecord = Record<string, unknown>;

function normalizeCategory(raw: AnyRecord): InventoryCategory {
  return {
    inventory_category_id: Number(raw.inventory_category_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: typeof raw.description === "string" ? raw.description : null,
  };
}

function normalizeItem(raw: AnyRecord): InventoryItem {
  const category =
    raw.inventory_category && typeof raw.inventory_category === "object"
      ? (raw.inventory_category as AnyRecord)
      : null;

  return {
    inventory_id: Number(raw.inventory_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: typeof raw.description === "string" ? raw.description : null,
    inventory_category_id: Number(raw.inventory_category_id ?? 0),
    inventory_category: category
      ? {
          inventory_category_id: Number(category.inventory_category_id ?? 0),
          name: String(category.name ?? ""),
          description:
            typeof category.description === "string" ? category.description : null,
        }
      : null,
    club_id: Number(raw.club_id ?? 0),
    amount: Number(raw.amount ?? 0),
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

export default async function InventoryPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("inventory");
  const territoryScope = resolveAdminTerritoryScope(user);

  let sections: InventorySectionOption[] = [];
  let categories: InventoryCategory[] = [];
  let localFields: LocalField[] = [];
  let clubTypes: ClubType[] = [];
  let initialItems: InventoryItem[] = [];
  let initialLocalFieldId: number | "all" = "all";
  let initialClubTypeId: number | "all" = "all";
  let loadError: string | null = null;

  if (territoryScope.level === "local_field") {
    initialLocalFieldId = territoryScope.localFieldId;
  }

  const [clubsResult, categoriesResult, localFieldsResult, clubTypesResult] =
    await Promise.allSettled([
      apiRequest<unknown>("/clubs"),
      listInventoryCategories(),
      listLocalFieldsForTerritory(user),
      listClubTypes(),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  if (clubsResult.status === "fulfilled") {
    const rawClubs = extractArray(clubsResult.value);
    sections = buildInventorySectionOptions(rawClubs, clubTypes);
  } else {
    const err = clubsResult.reason;
    loadError =
      err instanceof ApiError
        ? err.message
        : t("errors.failed_load_clubs");
  }

  if (categoriesResult.status === "fulfilled") {
    const rawCategories = extractArray(categoriesResult.value);
    categories = rawCategories
      .map(normalizeCategory)
      .filter((c) => c.inventory_category_id > 0);
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  }

  if (sections.length > 0 && !loadError) {
    const scopedSections = filterInventorySections(
      sections,
      initialLocalFieldId,
      initialClubTypeId,
    );
    const firstSection = scopedSections[0] ?? sections[0];

    if (firstSection) {
      if (initialLocalFieldId === "all" && firstSection.local_field_id) {
        initialLocalFieldId = firstSection.local_field_id;
      }
    }

    const initialSection =
      filterInventorySections(
        sections,
        initialLocalFieldId,
        initialClubTypeId,
      )[0] ?? firstSection;

    if (initialSection) {
      const instanceType = clubTypeIdToInstanceType(initialSection.club_type_id);
      try {
        const payload = await listClubInventory(initialSection.club_section_id, {
          instanceType,
        });
        const rawItems = extractArray(payload);
        initialItems = rawItems.map(normalizeItem);
      } catch (err) {
        console.warn("Failed to load initial inventory items:", err);
      }
    }
  }

  const initialSection =
    filterInventorySections(sections, initialLocalFieldId, initialClubTypeId)[0] ??
    sections[0] ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && sections.length === 0 && (
        <EmptyState
          icon={Package}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      )}

      {!loadError && sections.length > 0 && (
        <InventoryView
          sections={sections}
          categories={categories}
          localFields={localFields}
          clubTypes={clubTypes}
          territoryScope={territoryScope}
          initialItems={initialItems}
          initialSectionId={initialSection?.club_section_id ?? null}
          initialLocalFieldId={initialLocalFieldId}
          initialClubTypeId={initialClubTypeId}
        />
      )}
    </div>
  );
}
