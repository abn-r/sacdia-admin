import type { InventoryCategory } from "@/lib/api/inventory";
import { extractArray } from "@/lib/inventory/club-sections";

/** Inventory categories from the raw `GET /inventory/categories` payload. */
export function normalizeInventoryCategories(payload: unknown): InventoryCategory[] {
  return extractArray(payload)
    .map((raw) => ({
      inventory_category_id: Number(raw.inventory_category_id ?? raw.id ?? 0),
      name: String(raw.name ?? ""),
      description: typeof raw.description === "string" ? raw.description : null,
    }))
    .filter((category) => category.inventory_category_id > 0);
}
