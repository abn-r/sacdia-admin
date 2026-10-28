import { describe, expect, it } from "vitest";

import { pageResourceCategories, parseCategoryStatus } from "@/lib/resources/category-list";

const categories = [
  { resource_category_id: 1, name: "Guías", description: "Manuales", active: true },
  { resource_category_id: 2, name: "Viejos", description: null, active: false },
  { resource_category_id: 3, name: "Audios", description: "Guía de cantos", active: true },
];

describe("parseCategoryStatus", () => {
  it("maps the status Select values", () => {
    expect(parseCategoryStatus("true")).toBe("active");
    expect(parseCategoryStatus("false")).toBe("inactive");
    expect(parseCategoryStatus(undefined)).toBe("all");
    expect(parseCategoryStatus("all")).toBe("all");
  });
});

describe("pageResourceCategories", () => {
  it("keeps deactivated categories under 'all' so they can be reactivated", () => {
    const { items, meta } = pageResourceCategories(categories, { status: "all", page: 1, limit: 20 });
    expect(items.map((c) => c.resource_category_id)).toEqual([1, 2, 3]);
    expect(meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it("filters by status", () => {
    expect(
      pageResourceCategories(categories, { status: "inactive", page: 1, limit: 20 }).items,
    ).toEqual([categories[1]]);
    expect(
      pageResourceCategories(categories, { status: "active", page: 1, limit: 20 }).items.map(
        (c) => c.resource_category_id,
      ),
    ).toEqual([1, 3]);
  });

  it("searches name and description, case-insensitively", () => {
    const { items } = pageResourceCategories(categories, {
      status: "all",
      search: " guía ",
      page: 1,
      limit: 20,
    });
    expect(items.map((c) => c.resource_category_id)).toEqual([1, 3]);
  });

  it("pages the filtered rows and clamps an out-of-range page", () => {
    const first = pageResourceCategories(categories, { status: "all", page: 1, limit: 2 });
    expect(first.items.map((c) => c.resource_category_id)).toEqual([1, 2]);
    expect(first.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const clamped = pageResourceCategories(categories, { status: "all", page: 9, limit: 2 });
    expect(clamped.items.map((c) => c.resource_category_id)).toEqual([3]);
    expect(clamped.meta.page).toBe(2);
  });
});
