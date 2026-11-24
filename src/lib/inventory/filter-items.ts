import type { InventoryItem } from "@/lib/api/inventory";
import { DEFAULT_INVENTORY_CONDITION } from "@/lib/api/inventory";

export type InventoryStatusFilter = "active" | "inactive" | "all";

/** «Activo» is not a mark on the row any more: it is this filter. */
export function filterInventoryItems(
  items: InventoryItem[],
  filters: { categoryId: number | null; status: InventoryStatusFilter },
): InventoryItem[] {
  return items.filter((item) => {
    if (filters.categoryId !== null && item.inventory_category_id !== filters.categoryId) {
      return false;
    }
    const active = item.active !== false;
    if (filters.status === "active" && !active) return false;
    if (filters.status === "inactive" && active) return false;
    return true;
  });
}

/** Items whose condition is Regular or Malo (the ones worth a line in the page description). */
export function countNeedingAttention(items: InventoryItem[]): number {
  return items.filter(
    (item) =>
      item.active !== false &&
      (item.condition ?? DEFAULT_INVENTORY_CONDITION) !== DEFAULT_INVENTORY_CONDITION,
  ).length;
}
