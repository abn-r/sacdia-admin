"use client";

import { apiRequestFromClient } from "@/lib/api/client";
import { entityConfigs, type EntityKey } from "@/lib/catalogs/entities";
import type { CatalogItem } from "@/lib/catalogs/service";

function normalizeCollection(payload: unknown): CatalogItem[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({ active: true, ...item as CatalogItem }));
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data.map((item) => ({ active: true, ...item as CatalogItem }));
  }
  return [];
}

export async function fetchCatalogItems(entityKey: EntityKey): Promise<CatalogItem[]> {
  const config = entityConfigs[entityKey];
  try {
    const payload = await apiRequestFromClient<unknown>(config.listEndpoint);
    return normalizeCollection(payload);
  } catch {
    return [];
  }
}

export async function createCatalogItem(entityKey: EntityKey, payload: Record<string, unknown>) {
  const config = entityConfigs[entityKey];
  if (config.allowMutations === false) {
    throw new Error("Este catalogo es de solo lectura en la API oficial");
  }
  return apiRequestFromClient(config.adminEndpoint, { method: "POST", body: payload });
}

export async function updateCatalogItem(entityKey: EntityKey, id: number, payload: Record<string, unknown>) {
  const config = entityConfigs[entityKey];
  if (config.allowMutations === false) {
    throw new Error("Este catalogo es de solo lectura en la API oficial");
  }
  return apiRequestFromClient(`${config.adminEndpoint}/${id}`, { method: "PATCH", body: payload });
}

export async function deleteCatalogItem(entityKey: EntityKey, id: number) {
  const config = entityConfigs[entityKey];
  if (config.allowMutations === false) {
    throw new Error("Este catalogo es de solo lectura en la API oficial");
  }
  return apiRequestFromClient(`${config.adminEndpoint}/${id}`, { method: "DELETE" });
}
