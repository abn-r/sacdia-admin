import { Package } from "lucide-react";
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

type Club = {
  club_id: number;
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

function normalizeClub(raw: AnyRecord): Club {
  return {
    club_id: Number(raw.club_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Club ${raw.club_id ?? "?"}`),
    club_type_id: Number(raw.club_type_id ?? 2),
  };
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

function clubTypeToInstanceType(clubTypeId: number): "adv" | "pathf" | "mg" {
  if (clubTypeId === 1) return "adv";
  if (clubTypeId === 3) return "mg";
  return "pathf";
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function InventoryPage() {
  await requireAdminUser();

  let clubs: Club[] = [];
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
    clubs = rawClubs.map(normalizeClub).filter((c) => c.club_id > 0);
  } else {
    const err = clubsResult.reason;
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la lista de clubes.";
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
      const payload = await listClubInventory(firstClub.club_id, { instanceType });
      const rawItems = extractArray(payload);
      initialItems = rawItems.map(normalizeItem);
    } catch (err) {
      console.warn("Failed to load initial inventory items:", err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Gestión de inventario por club."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubs.length === 0 && (
        <EmptyState
          icon={Package}
          title="No hay clubes registrados"
          description="Registra al menos un club para gestionar su inventario."
        />
      )}

      {!loadError && clubs.length > 0 && (
        <InventoryView
          clubs={clubs}
          categories={categories}
          initialItems={initialItems}
          initialClubId={clubs[0]?.club_id ?? null}
        />
      )}
    </div>
  );
}
