import {
  INVENTORY_CONDITIONS,
  DEFAULT_INVENTORY_CONDITION,
} from "@/lib/api/inventory";
import type { InventoryCondition, InventoryItem } from "@/lib/api/inventory";

type AnyRecord = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableMoney(value: unknown): number | null {
  // Prisma Decimal columns are serialized as strings ("1250.50").
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCondition(value: unknown): InventoryCondition {
  return INVENTORY_CONDITIONS.includes(value as InventoryCondition)
    ? (value as InventoryCondition)
    : DEFAULT_INVENTORY_CONDITION;
}

/** `YYYY-MM-DD` from either a date string or an ISO timestamp. */
function normalizeCalendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : null;
}

export function normalizeInventoryItem(raw: AnyRecord): InventoryItem {
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
    condition: normalizeCondition(raw.condition),
    serial_number: nullableString(raw.serial_number),
    purchase_date: normalizeCalendarDate(raw.purchase_date),
    estimated_value: nullableMoney(raw.estimated_value),
    location: nullableString(raw.location),
    assigned_to: nullableString(raw.assigned_to),
    notes: nullableString(raw.notes),
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}
