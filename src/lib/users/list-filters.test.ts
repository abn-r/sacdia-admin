import { describe, expect, it } from "vitest";

import { clearUsersFilterParams, hasActiveUsersFilters } from "@/lib/users/list-filters";

describe("hasActiveUsersFilters", () => {
  it("is false for an unfiltered query", () => {
    expect(hasActiveUsersFilters({})).toBe(false);
    expect(hasActiveUsersFilters({ search: "  " })).toBe(false);
  });

  it("is true for search, role or status (including inactive)", () => {
    expect(hasActiveUsersFilters({ search: "ana" })).toBe(true);
    expect(hasActiveUsersFilters({ role: "coordinator" })).toBe(true);
    expect(hasActiveUsersFilters({ active: false })).toBe(true);
  });
});

describe("clearUsersFilterParams", () => {
  it("drops the filter keys and keeps the page size", () => {
    const next = clearUsersFilterParams(new URLSearchParams("search=ana&role=pastor&active=true&page=3&limit=50"));
    expect(next.toString()).toBe("limit=50");
  });
});
