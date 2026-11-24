import { describe, expect, it } from "vitest";
import type { InventoryItem } from "@/lib/api/inventory";
import { countNeedingAttention, filterInventoryItems } from "./filter-items";

const base: InventoryItem = {
  inventory_id: 1,
  name: "Carpa",
  inventory_category_id: 1,
  club_id: 1,
  amount: 2,
  active: true,
};

const items: InventoryItem[] = [
  { ...base, inventory_id: 1, condition: "bueno" },
  { ...base, inventory_id: 2, condition: "regular", inventory_category_id: 2 },
  { ...base, inventory_id: 3, condition: "malo", active: false },
  { ...base, inventory_id: 4 },
];

describe("inventory item filters", () => {
  it("shows active items by default and moves «Activo» to a filter", () => {
    expect(filterInventoryItems(items, { categoryId: null, status: "active" }).map((i) => i.inventory_id)).toEqual([1, 2, 4]);
    expect(filterInventoryItems(items, { categoryId: null, status: "inactive" }).map((i) => i.inventory_id)).toEqual([3]);
    expect(filterInventoryItems(items, { categoryId: null, status: "all" })).toHaveLength(4);
  });

  it("filters by category", () => {
    expect(filterInventoryItems(items, { categoryId: 2, status: "all" }).map((i) => i.inventory_id)).toEqual([2]);
  });

  it("counts only active items that are Regular or Malo", () => {
    expect(countNeedingAttention(items)).toBe(1);
  });
});
