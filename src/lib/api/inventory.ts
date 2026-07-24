import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventoryAction = "CREATE" | "UPDATE" | "DELETE";

export type InventoryHistoryEntry = {
  history_id: number;
  inventory_id: number;
  action: InventoryAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  performed_by: {
    name: string;
    paternal_last_name: string;
  } | null;
  created_at: string;
};

export type InstanceType = "adv" | "pathf" | "mg";

export const INSTANCE_TYPE_LABELS: Record<InstanceType, string> = {
  adv: "Aventureros",
  pathf: "Conquistadores",
  mg: "Guías Mayores",
};

export type InventoryCategory = {
  inventory_category_id: number;
  name: string;
  description?: string | null;
};

export type InventoryItem = {
  inventory_id: number;
  name: string;
  description?: string | null;
  inventory_category_id: number;
  inventory_category?: InventoryCategory | null;
  club_id: number;
  amount: number;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateInventoryPayload = {
  name: string;
  description?: string;
  inventory_category_id: number;
  amount: number;
  instanceType: InstanceType;
};

export type UpdateInventoryPayload = {
  name?: string;
  description?: string;
  inventory_category_id?: number;
  amount?: number;
};

export type InventoryListQuery = {
  instanceType: InstanceType;
  category?: number;
};

// ─── Server-side API functions ────────────────────────────────────────────────

export async function listInventoryCategories(): Promise<unknown> {
  return apiRequest("/inventory/catalogs/inventory-categories");
}

export async function listClubInventory(
  clubId: number,
  query: InventoryListQuery,
): Promise<unknown> {
  const params: Record<string, string | number> = {
    instanceType: query.instanceType,
  };
  if (query.category) params.category = query.category;

  return apiRequest(`/inventory/clubs/${clubId}/inventory`, { params });
}

// ─── Client-side API functions ────────────────────────────────────────────────

export async function createInventoryItem(
  clubId: number,
  data: CreateInventoryPayload,
): Promise<unknown> {
  return apiRequestFromClient(`/inventory/clubs/${clubId}/inventory`, {
    method: "POST",
    body: data,
  });
}

export async function updateInventoryItem(
  inventoryId: number,
  data: UpdateInventoryPayload,
): Promise<unknown> {
  return apiRequestFromClient(`/inventory/inventory/${inventoryId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteInventoryItem(inventoryId: number): Promise<unknown> {
  return apiRequestFromClient(`/inventory/inventory/${inventoryId}`, {
    method: "DELETE",
  });
}

export async function getInventoryHistory(
  inventoryId: number,
): Promise<InventoryHistoryEntry[]> {
  return apiRequestFromClient<InventoryHistoryEntry[]>(
    `/inventory/${inventoryId}/history`,
  );
}
