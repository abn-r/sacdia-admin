import { apiRequest, ApiError } from "@/lib/api/client";

export type CatalogItem = {
  id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  created_at?: string | null;
  [key: string]: unknown;
};

type RawResponse = {
  status?: string;
  data?: unknown;
  [key: string]: unknown;
};

function normalizeItems(payload: unknown): CatalogItem[] {
  if (Array.isArray(payload)) {
    return payload as CatalogItem[];
  }

  const res = payload as RawResponse | null;
  if (res?.data && Array.isArray(res.data)) {
    return res.data as CatalogItem[];
  }

  return [];
}

export type CatalogEndpointResult = {
  items: CatalogItem[];
  available: boolean;
  error?: string;
};

export async function fetchCatalogItems(
  endpoint: string,
  idKey: string = "id",
): Promise<CatalogEndpointResult> {
  try {
    const payload = await apiRequest<unknown>(endpoint);
    const raw = normalizeItems(payload);

    const items = raw.map((item) => ({
      ...item,
      id: (item as Record<string, unknown>)[idKey] as number ?? item.id,
    }));

    return { items, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { items: [], available: false, error: error.message };
    }
    return { items: [], available: false, error: "Error inesperado" };
  }
}

export async function createCatalogItem(
  endpoint: string,
  body: Record<string, unknown>,
) {
  return apiRequest<unknown>(endpoint, { method: "POST", body });
}

export async function updateCatalogItem(
  endpoint: string,
  id: number | string,
  body: Record<string, unknown>,
) {
  return apiRequest<unknown>(`${endpoint}/${id}`, { method: "PATCH", body });
}

export async function deleteCatalogItem(
  endpoint: string,
  id: number | string,
) {
  return apiRequest<unknown>(`${endpoint}/${id}`, { method: "DELETE" });
}
