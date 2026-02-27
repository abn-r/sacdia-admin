import { ApiError, apiRequest } from "@/lib/api/client";
import {
  entityConfigs,
  type EntityConfig,
  type EntityField,
  type EntityKey,
} from "@/lib/catalogs/entities";

export type CatalogItem = Record<string, unknown>;

function getIdValue(item: CatalogItem, config: EntityConfig): number {
  const id = item[config.idField];
  if (typeof id === "number") {
    return id;
  }

  return Number(id ?? 0);
}

function normalizeItem(entityKey: EntityKey, item: CatalogItem): CatalogItem {
  const normalized: CatalogItem = { ...item };

  // Legacy naming in districts/churches still uses districlub_type_id in backend.
  if (entityKey === "districts" || entityKey === "churches") {
    if (normalized.district_id === undefined && normalized.districlub_type_id !== undefined) {
      normalized.district_id = normalized.districlub_type_id;
    }
  }

  if (entityKey === "ecclesiastical-years" && normalized.name === undefined && normalized.year_id !== undefined) {
    normalized.name = `Anio ${normalized.year_id}`;
  }

  if (typeof normalized.active !== "boolean") {
    normalized.active = true;
  }

  return normalized;
}

function normalizeCollection(entityKey: EntityKey, payload: unknown): CatalogItem[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeItem(entityKey, item as CatalogItem));
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data.map((item) =>
      normalizeItem(entityKey, item as CatalogItem),
    );
  }

  return [];
}

function normalizeEntityItem(entityKey: EntityKey, payload: unknown): CatalogItem | null {
  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return normalizeItem(entityKey, data as CatalogItem);
    }
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return normalizeItem(entityKey, payload as CatalogItem);
  }

  return null;
}

export async function listEntityItems(entityKey: EntityKey, query: Record<string, string | undefined> = {}) {
  const config = entityConfigs[entityKey];

  const params = new URLSearchParams();

  if (config.parentFilter) {
    const value = query[config.parentFilter.queryParam];
    if (value) {
      params.set(config.parentFilter.queryParam, value);
    }
  }

  const path = params.toString() ? `${config.listEndpoint}?${params.toString()}` : config.listEndpoint;

  try {
    const payload = await apiRequest<unknown>(path);
    return normalizeCollection(entityKey, payload);
  } catch (error) {
    if (error instanceof ApiError && [404, 405].includes(error.status)) {
      return [];
    }

    throw error;
  }
}

export async function getEntityItemById(entityKey: EntityKey, id: number) {
  const config = entityConfigs[entityKey];

  try {
    const payload = await apiRequest<unknown>(`${config.adminEndpoint}/${id}`);
    const entity = normalizeEntityItem(entityKey, payload);
    if (entity) {
      return entity;
    }
  } catch (error) {
    if (!(error instanceof ApiError && [404, 405].includes(error.status))) {
      throw error;
    }
  }

  const items = await listEntityItems(entityKey);
  return items.find((item) => getIdValue(item, config) === id) ?? null;
}

export async function getSelectOptions(entityKey: EntityKey, includeInactive = false) {
  const config = entityConfigs[entityKey];
  const items = await listEntityItems(entityKey);
  const filteredItems = includeInactive ? items : items.filter((item) => item.active !== false);

  return filteredItems.map((item) => ({
    label: String(item[config.nameField] ?? `#${item[config.idField] ?? ""}`),
    value: Number(item[config.idField]),
  }));
}

function parseFieldValue(field: EntityField, rawValue: FormDataEntryValue | null) {
  if (field.type === "checkbox") {
    return rawValue === "on" || rawValue === "true";
  }

  if (rawValue === null || rawValue === "") {
    return field.required ? null : undefined;
  }

  if (field.type === "number" || field.type === "select") {
    const numberValue = Number(rawValue);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return String(rawValue).trim();
}

export function buildPayloadFromForm(config: EntityConfig, formData: FormData) {
  const payload: Record<string, unknown> = {};

  for (const field of config.fields) {
    const parsedValue = parseFieldValue(field, formData.get(field.name));

    if (field.required && (parsedValue === null || parsedValue === undefined || parsedValue === "")) {
      throw new Error(`El campo ${field.label} es obligatorio`);
    }

    if (parsedValue !== undefined) {
      payload[field.name] = parsedValue;
    }
  }

  return payload;
}

export async function createEntityItem(entityKey: EntityKey, payload: Record<string, unknown>) {
  const config = entityConfigs[entityKey];
  return apiRequest(config.adminEndpoint, {
    method: "POST",
    body: payload,
  });
}

export async function updateEntityItem(entityKey: EntityKey, id: number | string, payload: Record<string, unknown>) {
  const config = entityConfigs[entityKey];
  return apiRequest(`${config.adminEndpoint}/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteEntityItem(entityKey: EntityKey, id: number | string) {
  const config = entityConfigs[entityKey];
  return apiRequest(`${config.adminEndpoint}/${id}`, {
    method: "DELETE",
  });
}
