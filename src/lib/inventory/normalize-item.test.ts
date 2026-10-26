import { describe, expect, it } from "vitest";
import { normalizeInventoryItem } from "@/lib/inventory/normalize-item";

const BASE = {
  inventory_id: 7,
  name: "Carpa",
  inventory_category_id: 2,
  club_id: 3,
  amount: 4,
};

describe("normalizeInventoryItem", () => {
  it("maps the extended fields from the API response", () => {
    const item = normalizeInventoryItem({
      ...BASE,
      condition: "malo",
      serial_number: "SN-1",
      purchase_date: "2024-03-15",
      estimated_value: 1250.5,
      location: "Bodega",
      assigned_to: "Ana",
      notes: "Rota",
    });

    expect(item).toMatchObject({
      condition: "malo",
      serial_number: "SN-1",
      purchase_date: "2024-03-15",
      estimated_value: 1250.5,
      location: "Bodega",
      assigned_to: "Ana",
      notes: "Rota",
    });
  });

  it("parses Decimal strings and ISO timestamps", () => {
    const item = normalizeInventoryItem({
      ...BASE,
      estimated_value: "99.90",
      purchase_date: "2024-03-15T00:00:00.000Z",
    });

    expect(item.estimated_value).toBe(99.9);
    expect(item.purchase_date).toBe("2024-03-15");
  });

  it("keeps a zero estimated value instead of treating it as empty", () => {
    expect(normalizeInventoryItem({ ...BASE, estimated_value: 0 }).estimated_value).toBe(0);
    expect(normalizeInventoryItem({ ...BASE, estimated_value: "0.00" }).estimated_value).toBe(0);
  });

  it("falls back to defaults for missing or unknown values", () => {
    const item = normalizeInventoryItem({ ...BASE, condition: "roto", estimated_value: null });

    expect(item.condition).toBe("bueno");
    expect(item.serial_number).toBeNull();
    expect(item.purchase_date).toBeNull();
    expect(item.estimated_value).toBeNull();
    expect(item.location).toBeNull();
    expect(item.assigned_to).toBeNull();
    expect(item.notes).toBeNull();
  });
});
