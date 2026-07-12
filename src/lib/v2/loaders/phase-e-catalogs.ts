import { ApiError } from "@/lib/api/client";
import {
  extractItems,
  extractMeta,
  readParam,
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";

export type PhaseECatalogSearchParams = {
  page: number;
  limit: number;
  search?: string;
  active?: boolean;
};

export type PhaseECatalogListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PhaseECatalogListResult = {
  items: Record<string, unknown>[];
  meta: PhaseECatalogListMeta;
  loadError: string | null;
};

export function parsePhaseECatalogSearchParams(
  raw: Record<string, string | string[] | undefined>,
): PhaseECatalogSearchParams {
  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  return {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(activeRaw === "true"
      ? { active: true }
      : activeRaw === "false"
        ? { active: false }
        : {}),
  };
}

export function buildPhaseECatalogListParams(
  query: PhaseECatalogSearchParams,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: query.page,
    limit: query.limit,
  };
  if (query.search) params.search = query.search;
  if (query.active === true) params.active = true;
  if (query.active === false) params.active = false;
  return params;
}

export async function loadPhaseECatalogList(
  query: PhaseECatalogSearchParams,
  fetcher: (
    params: Record<string, string | number | boolean>,
  ) => Promise<unknown>,
  fallbackLoadError: string,
): Promise<PhaseECatalogListResult> {
  let items: Record<string, unknown>[] = [];
  let meta: PhaseECatalogListMeta = {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 1,
  };
  let loadError: string | null = null;

  try {
    const payload = await fetcher(buildPhaseECatalogListParams(query));
    items = extractItems(payload);
    meta = extractMeta(payload, query.page, query.limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : fallbackLoadError;
    }
  }

  return { items, meta, loadError };
}
