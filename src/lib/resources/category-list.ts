/**
 * GET /resource-categories returns every category in one array (no server
 * filter or pagination), so the admin list filters and pages it here.
 */

export type CategoryStatusFilter = "all" | "active" | "inactive";

export type CategoryListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CategoryLike = Record<string, unknown>;

/** `?active=` from the list's status Select: "true", "false" or absent ("all"). */
export function parseCategoryStatus(value: string | undefined): CategoryStatusFilter {
  if (value === "true") return "active";
  if (value === "false") return "inactive";
  return "all";
}

function isActive(item: CategoryLike): boolean {
  return item.active !== false;
}

function matchesSearch(item: CategoryLike, needle: string): boolean {
  if (!needle) return true;
  return [item.name, item.description].some(
    (value) => typeof value === "string" && value.toLocaleLowerCase("es").includes(needle),
  );
}

export function pageResourceCategories<T extends CategoryLike>(
  items: T[],
  options: { status: CategoryStatusFilter; search?: string; page: number; limit: number },
): { items: T[]; meta: CategoryListMeta } {
  const needle = (options.search ?? "").trim().toLocaleLowerCase("es");
  const filtered = items.filter(
    (item) =>
      (options.status === "all" || isActive(item) === (options.status === "active")) &&
      matchesSearch(item, needle),
  );

  const limit = Math.max(1, Math.floor(options.limit));
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const page = Math.min(Math.max(1, Math.floor(options.page)), totalPages);
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    meta: { page, limit, total: filtered.length, totalPages },
  };
}
