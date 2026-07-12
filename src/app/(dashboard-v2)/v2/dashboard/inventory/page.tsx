import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InventoryView } from "@/components/inventory/inventory-view";
import { apiRequest, ApiError } from "@/lib/api/client";
import { listInventoryCategories, listClubInventory } from "@/lib/api/inventory";
import { requireAdminUser } from "@/lib/auth/session";
import type { InventoryItem, InventoryCategory } from "@/lib/api/inventory";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

type InventoryClubOption = {
  club_section_id: number;
  main_club_id: number | null;
  name: string;
  club_type_id: number;
};

// ─── Normalizers ───────────────────────────────────────────────────────────────

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function clubTypeNameToId(name: unknown): number {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("aventurer")) return 1;
  if (normalized.includes("guía") || normalized.includes("guia")) return 3;
  return 2;
}

function normalizeClubOptions(raw: AnyRecord): InventoryClubOption[] {
  const mainClubId = Number(raw.club_id ?? raw.id ?? 0) || null;
  const clubName = String(raw.name ?? `Club ${raw.club_id ?? "?"}`);
  const sections = Array.isArray(raw.club_sections)
    ? (raw.club_sections as AnyRecord[])
    : [];

  if (sections.length === 0) {
    const sectionId = Number(raw.club_section_id ?? 0);
    if (sectionId <= 0) return [];
    return [
      {
        club_section_id: sectionId,
        main_club_id: mainClubId,
        name: clubName,
        club_type_id: Number(raw.club_type_id ?? 2),
      },
    ];
  }

  return sections
    .map((section) => {
      const sectionId = Number(section.club_section_id ?? 0);
      if (sectionId <= 0) return null;
      const clubTypes =
        section.club_types && typeof section.club_types === "object"
          ? (section.club_types as AnyRecord)
          : null;
      const typeName = String(clubTypes?.name ?? "");
      return {
        club_section_id: sectionId,
        main_club_id: mainClubId,
        name: `${clubName} · ${typeName || `Sección ${sectionId}`}`,
        club_type_id: clubTypeNameToId(typeName),
      };
    })
    .filter((option): option is InventoryClubOption => option !== null);
}

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
      : raw.category && typeof raw.category === "object"
        ? (raw.category as AnyRecord)
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
    club_id: raw.club_id == null ? null : Number(raw.club_id),
    club_section_id:
      raw.club_section_id == null ? null : Number(raw.club_section_id),
    amount: Number(raw.amount ?? 0),
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

function clubTypeToInstanceType(clubTypeId: number): "adv" | "pathf" | "mg" {
  if (clubTypeId === 1) return "adv";
  if (clubTypeId === 3) return "mg";
  return "pathf";
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function InventoryPage() {
  await requireAdminUser();
  const t = await getTranslations("inventory");

  let clubs: InventoryClubOption[] = [];
  let categories: InventoryCategory[] = [];
  let initialItems: InventoryItem[] = [];
  let loadError: string | null = null;

  // 1. Load clubs and categories in parallel
  const [clubsResult, categoriesResult] = await Promise.allSettled([
    apiRequest<unknown>("/clubs"),
    listInventoryCategories(),
  ]);

  if (clubsResult.status === "fulfilled") {
    const rawClubs = extractArray(clubsResult.value);
    clubs = rawClubs.flatMap(normalizeClubOptions);
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
  // categories failure is non-fatal — user can still view items without category filter

  // 2. Fetch initial items for the first club (best effort)
  if (clubs.length > 0 && !loadError) {
    const firstClub = clubs[0];
    const instanceType = clubTypeToInstanceType(firstClub.club_type_id);
    try {
      const payload = await listClubInventory(firstClub.club_section_id, {
        instanceType,
      });
      const rawItems = extractArray(payload);
      initialItems = rawItems.map(normalizeItem);
    } catch (err) {
      console.warn("Failed to load initial inventory items:", err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubs.length === 0 && (
        <EmptyState
          icon={Package}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      )}

      {!loadError && clubs.length > 0 && (
        <InventoryView
          clubs={clubs}
          categories={categories}
          initialItems={initialItems}
          initialClubSectionId={clubs[0]?.club_section_id ?? null}
        />
      )}
    </div>
  );
}
